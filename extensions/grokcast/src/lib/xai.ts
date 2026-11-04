// The xAI SDK client, signed in as the user, shared by every Grok feature. No
// Raycast imports, so tests run it under plain Node with a fake `fetch`.

import {
  APIConnectionError,
  APIError,
  APIStatusError,
  AuthenticationError,
  PermissionDeniedError,
  RateLimitError,
  SpaceXAI,
  TimeoutError,
} from "@xai-official/sdk"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Match from "effect/Match"
import * as Option from "effect/Option"
import * as P from "effect/Predicate"
import * as Schema from "effect/Schema"
import { GrokSession } from "./session.ts"

/**
 * The SDK will not start without an API key. `GrokSession.fetch` replaces the
 * authorization header with the signed-in user's token on every request.
 */
const UNUSED_API_KEY = "grokcast-uses-oauth"

/** The SDK threw or rejected. `cause` is what it threw. */
export class XaiSdkError extends Schema.TaggedError<XaiSdkError>()("XaiSdkError", {
  cause: Schema.Defect(),
}) {}

/** What the UI offers after a failed xAI request. */
export const XaiFailureReason = Schema.Literals([
  "signIn",
  "plan",
  "usageLimit",
  "network",
  "failed",
])
export type XaiFailureReason = typeof XaiFailureReason.Type

/** A failed xAI request, described for the user. */
export interface XaiFailure {
  readonly reason: XaiFailureReason
  readonly message: string
}

/** The words for one feature's failures, such as "speech-to-text". */
export interface XaiFeatureWording {
  /** Used in "xAI refused <feature> for this account". */
  readonly feature: string
  /** Said when xAI answered with an error status or something unexpected, such as "xAI could not transcribe the audio". */
  readonly failed: string
}

const SessionFailure = Schema.Struct({ _tag: Schema.String, message: Schema.String })

/** The error `GrokSession.fetch` rejected with (such as `NotSignedInError`), inside the SDK's error. */
const sessionFailure = (error: XaiSdkError) =>
  Schema.decodeUnknownOption(SessionFailure)(
    APIError.is(error.cause) ? error.cause.cause : undefined,
  )

const failure = (reason: XaiFailureReason, message: string): XaiFailure => ({ reason, message })

/** Say why an SDK call failed, in `wording` for the feature that made it. */
export const describeXaiError = (error: XaiSdkError, wording: XaiFeatureWording): XaiFailure =>
  Option.match(sessionFailure(error), {
    onSome: (session) =>
      Match.value(session._tag).pipe(
        Match.when("NotSignedInError", () => failure("signIn", session.message)),
        Match.orElse(() => failure("failed", session.message)),
      ),
    onNone: () =>
      Match.value(error.cause).pipe(
        Match.when(Match.instanceOf(AuthenticationError), () =>
          failure("signIn", "xAI did not accept your sign-in. Sign in again from Grok Account."),
        ),
        Match.when(Match.instanceOf(PermissionDeniedError), () =>
          failure(
            "plan",
            `xAI refused ${wording.feature} for this account. Check that your Grok or X plan includes it.`,
          ),
        ),
        Match.when(Match.instanceOf(RateLimitError), () =>
          failure("usageLimit", "You reached your Grok usage limit. Try again later."),
        ),
        Match.when(Match.instanceOf(TimeoutError), () =>
          failure("network", "xAI took too long to answer. Try again."),
        ),
        Match.when(Match.instanceOf(APIConnectionError), () =>
          failure("network", "Could not reach xAI. Check your internet connection."),
        ),
        // xAI answers 402 when the account has no plan that covers the API, or ran out of credits.
        Match.when(
          (cause: unknown) => cause instanceof APIStatusError && cause.status === 402,
          () =>
            failure(
              "plan",
              "xAI says this account is out of credits or its plan does not cover this. Check your usage and plan at grok.com.",
            ),
        ),
        Match.when(Match.instanceOf(APIStatusError), (status) =>
          failure("failed", `${wording.failed} (status ${status.status}).`),
        ),
        Match.orElse(() => failure("failed", `${wording.failed}.`)),
      ),
  })

/** Run one SDK call. `signal` aborts it when the effect is interrupted. */
export const callXai = <A>(call: (signal: AbortSignal) => Promise<A>) =>
  Effect.tryPromise({ try: call, catch: (cause) => new XaiSdkError({ cause }) })

/** The SDK could not start in this app. */
export class XaiStartError extends Schema.TaggedError<XaiStartError>()("XaiStartError", {
  message: Schema.String,
}) {}

/** The lowest Node version the SDK's constructor accepts. */
const SDK_MIN_NODE = "22.13.0"

/** Tinycast's `process.versions`, where it sets `tinycast`. None in Raycast. */
const tinycastVersions = () =>
  Option.fromNullishOr(globalThis.process?.versions).pipe(
    Option.filter((versions) => P.hasProperty(versions, "tinycast")),
  )

const newClient = (fetch: GrokSession["Service"]["fetch"]) =>
  Effect.try({
    try: () => new SpaceXAI({ apiKey: UNUSED_API_KEY, fetch }),
    catch: (cause) => new XaiSdkError({ cause }),
  })

/**
 * Start the SDK client. Tinycast runs extensions in its own engine and reports Node
 * 22.0.0, which fails the SDK's Node 22.13 check in its constructor, though Tinycast
 * provides every web API the SDK uses. So in Tinycast only, the reported version is
 * raised while the constructor runs, then put back.
 */
const startClient = (fetch: GrokSession["Service"]["fetch"]) =>
  Option.match(tinycastVersions(), {
    onNone: () => newClient(fetch),
    onSome: (versions) =>
      Effect.acquireUseRelease(
        Effect.sync(() => {
          const reported = versions.node
          versions.node = SDK_MIN_NODE
          return reported
        }),
        () => newClient(fetch),
        (reported) =>
          Effect.sync(() => {
            versions.node = reported
          }),
      ),
  }).pipe(
    Effect.mapError(
      () => new XaiStartError({ message: "The xAI SDK could not start in this app." }),
    ),
  )

const make = Effect.fn("XaiClient.make")(function* () {
  const session = yield* GrokSession
  // Made on first use, so a host the SDK refuses to start in fails only there.
  const client = yield* Effect.cached(startClient(session.fetch))
  return XaiClient.of({ client })
})

/** The `SpaceXAI` client for the signed-in user. Every feature shares one. */
export class XaiClient extends Context.Service<
  XaiClient,
  {
    readonly client: Effect.Effect<SpaceXAI, XaiStartError>
  }
>()("grokcast/XaiClient") {
  static readonly layer = Layer.effect(XaiClient, make())
}
