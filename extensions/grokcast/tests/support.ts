import * as Arr from "effect/Array"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as TestClock from "effect/testing/TestClock"
import { ClientId, OAuthEndpoints, XaiEndpoints } from "../src/lib/oauth.ts"
import { GrokSession, TokenStore, type FetchFn, type StoredTokens } from "../src/lib/session.ts"
import { XaiClient } from "../src/lib/xai.ts"

/** The fixed "now" every test starts at. */
export const NOW = 1_800_000_000_000

export const endpoints = new OAuthEndpoints({
  deviceAuthorization: "https://auth.x.ai/oauth2/device/code",
  token: "https://auth.x.ai/oauth2/token",
  revocation: Option.some("https://auth.x.ai/oauth2/revoke"),
})

export interface Recorded {
  readonly url: string
  readonly method: string
  readonly headers: Headers
  readonly body: string
}

export interface FakeFetch {
  readonly fetch: FetchFn
  readonly requests: Array<Recorded>
}

/** The form body of the request at `index`, or an empty form when there is none. */
export const formOf = (fetch: FakeFetch, index: number): URLSearchParams =>
  new URLSearchParams(
    Arr.get(fetch.requests, index).pipe(
      Option.map((request) => request.body),
      Option.getOrElse(() => ""),
    ),
  )

/** A fake `fetch` that records each request and answers from `respond`. */
export function fakeFetch(respond: (request: Recorded, index: number) => Response): FakeFetch {
  const requests: Array<Recorded> = []
  const fetchFn: FetchFn = async (input, init) => {
    const request = new Request(input, init)
    const recorded = {
      url: request.url,
      method: request.method,
      headers: request.headers,
      body: await request.text(),
    }
    requests.push(recorded)
    return respond(recorded, requests.length - 1)
  }
  return { fetch: fetchFn, requests }
}

export type JsonBody = Readonly<Record<string, string | number>>

export function json(body: JsonBody, status = 200): Response {
  return Response.json(body, { status })
}

export interface MemoryStore {
  current: Option.Option<StoredTokens>
}

export function memoryStore(initial?: StoredTokens): MemoryStore {
  return { current: Option.fromNullishOr(initial) }
}

const memoryStoreLayer = (store: MemoryStore) =>
  Layer.succeed(
    TokenStore,
    TokenStore.of({
      load: Effect.sync(() => store.current),
      save: (tokens) =>
        Effect.sync(() => {
          store.current = Option.some(tokens)
        }),
      clear: Effect.sync(() => {
        store.current = Option.none()
      }),
    }),
  )

/**
 * The session, the xAI SDK client, and their dependencies, with a fake `fetch`, an
 * in-memory store and a test clock at `NOW`.
 */
export const testLayer = (fetch: FakeFetch, store: MemoryStore = memoryStore()) =>
  XaiClient.layer.pipe(
    Layer.provideMerge(GrokSession.layer),
    Layer.provideMerge(
      Layer.mergeAll(
        Layer.succeed(XaiEndpoints, XaiEndpoints.of({ get: Effect.succeed(endpoints) })),
        Layer.succeed(ClientId, "client"),
        memoryStoreLayer(store),
      ),
    ),
    Layer.provideMerge(FetchHttpClient.layer),
    Layer.provideMerge(Layer.succeed(FetchHttpClient.Fetch, fetch.fetch)),
    Layer.provideMerge(TestClock.layer()),
  )

type TestServices = Layer.Success<ReturnType<typeof testLayer>>

/** Run a test program against `testLayer`. */
export const run = <A, E>(
  program: Effect.Effect<A, E, TestServices>,
  fetch: FakeFetch,
  store?: MemoryStore,
): Promise<A> =>
  Effect.runPromise(
    TestClock.setTime(NOW).pipe(Effect.andThen(program), Effect.provide(testLayer(fetch, store))),
  )

/** A PNG signature and IHDR chunk for a `width` by `height` image. */
export const pngHeader = (width: number, height: number) => {
  const bytes = new Uint8Array(33)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13], 0)
  bytes.set([0x49, 0x48, 0x44, 0x52], 12)
  const view = new DataView(bytes.buffer)
  view.setUint32(16, width)
  view.setUint32(20, height)
  return bytes
}
