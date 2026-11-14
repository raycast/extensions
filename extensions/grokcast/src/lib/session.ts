// The signed-in Grok session: keeps the access token fresh and signs requests to
// api.x.ai. No Raycast imports, so tests run it under plain Node.

import * as Clock from "effect/Clock"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Match from "effect/Match"
import * as Option from "effect/Option"
import * as P from "effect/Predicate"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as Semaphore from "effect/Semaphore"
import * as FetchHttpClient from "effect/http/FetchHttpClient"
import * as HttpClient from "effect/http/HttpClient"
import { ClientId, refreshTokens, revokeToken, XaiEndpoints, type TokenResponse } from "./oauth.ts"

/** Refresh this long before the access token expires. */
export const REFRESH_MARGIN_MS = 5 * 60_000

export class StoredTokens extends Schema.Class<StoredTokens>("StoredTokens")({
  accessToken: Schema.Redacted(Schema.String),
  refreshToken: Schema.Option(Schema.Redacted(Schema.String)),
  idToken: Schema.Option(Schema.Redacted(Schema.String)),
  /** Unix time in milliseconds. */
  expiresAt: Schema.Finite,
}) {}

/** There is no usable sign-in. The UI tells the user to sign in from Grok Account. */
export class NotSignedInError extends Schema.TaggedError<NotSignedInError>()("NotSignedInError", {
  message: Schema.String,
}) {}

/** The token store could not be read or written. */
export class TokenStoreError extends Schema.TaggedError<TokenStoreError>()("TokenStoreError", {
  message: Schema.String,
  cause: Schema.Defect(),
}) {}

/** The request to api.x.ai failed before a response arrived. */
export class XaiFetchError extends Schema.TaggedError<XaiFetchError>()("XaiFetchError", {
  cause: Schema.Defect(),
}) {}

/** Run one call to the token store. A failure becomes a `TokenStoreError` with `message`. */
export const tokenStoreCall = <A>(message: string, call: () => Promise<A>) =>
  Effect.tryPromise({ try: call, catch: (cause) => new TokenStoreError({ message, cause }) })

/** A token store operation: it gives `A`, or fails with `TokenStoreError`. */
type TokenStoreOperation<A> = ReturnType<typeof tokenStoreCall<A>>

/** Where the tokens live. The extension uses Raycast's encrypted OAuth token store. */
export class TokenStore extends Context.Service<
  TokenStore,
  {
    readonly load: TokenStoreOperation<Option.Option<StoredTokens>>
    readonly save: (tokens: StoredTokens) => TokenStoreOperation<void>
    readonly clear: TokenStoreOperation<void>
  }
>()("grok/TokenStore") {}

/**
 * Convert a token response for storage. xAI rotates the refresh token on every
 * refresh, so a new one always replaces the old one. The old one is kept only when
 * the response has none.
 */
export const toStoredTokens = (
  response: TokenResponse,
  now: number,
  previous: Option.Option<StoredTokens>,
): StoredTokens =>
  new StoredTokens({
    accessToken: response.access_token,
    refreshToken: Option.orElse(response.refresh_token, () =>
      Option.flatMap(previous, (tokens) => tokens.refreshToken),
    ),
    idToken: Option.orElse(response.id_token, () => Option.flatMap(previous, (tokens) => tokens.idToken)),
    expiresAt: now + Option.getOrElse(response.expires_in, () => 0) * 1000,
  })

export const needsRefresh = (tokens: StoredTokens, now: number): boolean => tokens.expiresAt - REFRESH_MARGIN_MS <= now

const sameToken = (a: Redacted.Redacted<string>, b: Redacted.Redacted<string>): boolean =>
  Redacted.value(a) === Redacted.value(b)

// Tinycast's Request drops the signal of a Request it copies unless it is passed again.
function withBearer(request: Request, token: Redacted.Redacted<string>): Request {
  const headers = new Headers(request.headers)
  headers.set("authorization", `Bearer ${Redacted.value(token)}`)

  return new Request(request, { headers, signal: request.signal })
}

/**
 * A copy of `request` to send again after a 401. Tinycast's Request has no `clone`,
 * but Tinycast can send the same body twice, so a plain copy is enough there.
 */
const copyRequest = (request: Request): Request =>
  Match.value(request).pipe(
    Match.when(
      (original: Request) => P.isFunction(original.clone),
      (original) => original.clone(),
    ),
    Match.orElse((original) => new Request(original, { signal: original.signal })),
  )

export type FetchFn = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

const notSignedIn = new NotSignedInError({
  message: "Not signed in to Grok. Sign in from Grok Account first.",
})

const signInExpired = new NotSignedInError({
  message: "The Grok sign-in expired. Sign in again from Grok Account.",
})

const make = Effect.fn("GrokSession.make")(function* () {
  const store = yield* TokenStore
  const endpoints = yield* XaiEndpoints
  const clientId = yield* ClientId
  const rawFetch = yield* FetchHttpClient.Fetch
  const context = yield* Effect.context<HttpClient.HttpClient>()
  // Concurrent callers in this process share one refresh, because a rotated
  // refresh token can be spent only once.
  const refreshLock = yield* Semaphore.make(1)

  const load = store.load.pipe(
    Effect.flatMap(Option.match({ onNone: () => Effect.fail(notSignedIn), onSome: Effect.succeed })),
  )

  const expire = store.clear.pipe(Effect.andThen(() => Effect.fail(signInExpired)))

  const saveRefreshed = (response: TokenResponse, current: StoredTokens) =>
    Clock.currentTimeMillis.pipe(
      Effect.map((now) => toStoredTokens(response, now, Option.some(current))),
      Effect.tap(store.save),
    )

  const refreshStored = (current: StoredTokens) =>
    Effect.gen(function* () {
      const refreshToken = yield* Option.match(current.refreshToken, {
        onNone: () => expire,
        onSome: Effect.succeed,
      })

      const resolved = yield* endpoints.get

      return yield* refreshTokens(resolved, clientId, refreshToken).pipe(
        Effect.flatMap((response) => saveRefreshed(response, current)),
        Effect.catchTag("OAuthError", (error) =>
          Match.value(error.code).pipe(
            Match.when("invalid_grant", () => recoverSpentRefreshToken(current)),
            Match.orElse(() => Effect.fail(error)),
          ),
        ),
      )
    })

  const runRefresh = Effect.fn("GrokSession.refresh")(function* (stale: Redacted.Redacted<string>) {
    const current = yield* load
    const now = yield* Clock.currentTimeMillis

    // Another caller or command already refreshed: use its tokens.
    const refreshedElsewhere = Option.liftPredicate(
      current,
      (tokens) => !sameToken(tokens.accessToken, stale) && !needsRefresh(tokens, now),
    )

    return yield* Option.match(refreshedElsewhere, {
      onNone: () => refreshStored(current),
      onSome: Effect.succeed,
    })
  })

  /** Another process may have spent this refresh token and saved a new one. */
  const recoverSpentRefreshToken = Effect.fn("GrokSession.recoverSpentRefreshToken")(function* (current: StoredTokens) {
    const latest = yield* store.load
    const now = yield* Clock.currentTimeMillis

    const newer = Option.filter(
      latest,
      (tokens) =>
        !Option.makeEquivalence(sameToken)(tokens.refreshToken, current.refreshToken) && !needsRefresh(tokens, now),
    )

    return yield* Option.match(newer, { onNone: () => expire, onSome: Effect.succeed })
  })

  const refresh = (stale: Redacted.Redacted<string>) => refreshLock.withPermits(1)(runRefresh(stale))

  const refreshedAccessToken = (tokens: StoredTokens) =>
    refresh(tokens.accessToken).pipe(Effect.map((fresh) => fresh.accessToken))

  /** A current access token, refreshed first when it is within five minutes of expiry. */
  const accessToken = Effect.gen(function* () {
    const tokens = yield* load
    const now = yield* Clock.currentTimeMillis

    return yield* Option.match(
      Option.liftPredicate(tokens, (current) => needsRefresh(current, now)),
      { onNone: () => Effect.succeed(tokens.accessToken), onSome: refreshedAccessToken },
    )
  }).pipe(Effect.withSpan("GrokSession.accessToken"))

  const sendRaw = (request: Request) =>
    Effect.tryPromise({
      try: () => rawFetch(request),
      catch: (cause) => new XaiFetchError({ cause }),
    })

  /** After a 401: drop the body, refresh once, and send the copy with the new token. */
  const retryWithFreshToken = (retry: Request, stale: Redacted.Redacted<string>, unauthorized: Response) =>
    Effect.tryPromise(() => unauthorized.body?.cancel() ?? Promise.resolve()).pipe(
      Effect.ignore,
      Effect.andThen(() => refresh(stale)),
      Effect.flatMap((fresh) => sendRaw(withBearer(retry, fresh.accessToken))),
    )

  const authorizedFetch = Effect.fn("GrokSession.fetch")(function* (request: Request) {
    const retry = copyRequest(request)
    const token = yield* accessToken
    const response = yield* sendRaw(withBearer(request, token))

    return yield* Option.match(
      Option.liftPredicate(response, (answer) => answer.status === 401),
      {
        onNone: () => Effect.succeed(response),
        onSome: (unauthorized) => retryWithFreshToken(retry, token, unauthorized),
      },
    )
  })

  const runPromise = Effect.runPromiseWith(context)

  /**
   * A `fetch` for the xAI SDK. It sets the bearer token on each request, and on a 401
   * it refreshes once and retries. Pass it as `new SpaceXAI({ apiKey, fetch })`.
   */
  const fetch: FetchFn = (input, init) =>
    runPromise(
      authorizedFetch(new Request(input, init)).pipe(
        // The SDK inspects fetch rejections (aborts, network errors), so they pass through unchanged.
        Effect.catchTag("XaiFetchError", (error) => Effect.die(error.cause)),
      ),
    )

  const revokeAndClear = (tokens: StoredTokens) =>
    Effect.gen(function* () {
      const revoked = yield* endpoints.get.pipe(
        Effect.flatMap((resolved) =>
          revokeToken(
            resolved,
            clientId,
            Option.getOrElse(tokens.refreshToken, () => tokens.accessToken),
          ),
        ),
        Effect.exit,
      )

      yield* store.clear
      yield* revoked

      return true
    })

  /** Revoke the refresh token at xAI, then clear local tokens. Local tokens are cleared even if the revoke fails. */
  const signOut = store.load.pipe(
    Effect.flatMap(Option.match({ onNone: () => Effect.succeed(false), onSome: revokeAndClear })),
    Effect.withSpan("GrokSession.signOut"),
  )

  return { accessToken, refresh, fetch, signOut }
})

export class GrokSession extends Context.Service<GrokSession>()("grok/GrokSession", {
  make: make(),
}) {
  static readonly layer = Layer.effect(GrokSession, GrokSession.make)
}
