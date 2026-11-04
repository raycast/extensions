// xAI OAuth for a Grok or X subscription. This module has no Raycast imports, so
// tests run it under plain Node.

import * as Arr from "effect/Array"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Match from "effect/Match"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Ref from "effect/Ref"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as Base64Url from "effect/encoding/Base64Url"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as HttpClientResponse from "effect/http/HttpClientResponse"

/** The xAI OAuth issuer. Grok Build signs in here too. */
export const XAI_ISSUER = "https://auth.x.ai"

/**
 * Grok Build's public OAuth client. xAI has no third-party client registration
 * yet, so Hermes, OpenCode and others reuse this ID. Users can override it in the
 * extension preferences.
 */
export const DEFAULT_CLIENT_ID = "b1a00492-073a-47ea-816f-4c329264a828"

/** `api:access` is what lets the token call `api.x.ai`. Without it, sign-in works and API calls fail. */
export const XAI_SCOPES = "openid profile email offline_access grok-cli:access api:access"

/** Sent with each authorization request so xAI can attribute traffic to this extension. */
export const REFERRER = "grokcast"

/** An OAuth error response, or a response this module could not use. `code` is the OAuth `error` value when there is one. */
export class OAuthError extends Schema.TaggedError<OAuthError>()("OAuthError", {
  code: Schema.String,
  message: Schema.String,
  status: Schema.Option(Schema.Number),
}) {}

const decodeUrl = Schema.decodeUnknownOption(Schema.URLFromString)

/** True when `url` is HTTPS on `x.ai` or a subdomain. Discovery results are checked with this so a token is never sent elsewhere. */
export const isXaiUrl = (url: string): boolean =>
  Option.exists(
    decodeUrl(url),
    (parsed) =>
      parsed.protocol === "https:" &&
      (parsed.hostname === "x.ai" || parsed.hostname.endsWith(".x.ai")),
  )

/** An HTTPS URL on `x.ai`. */
export const XaiUrl = Schema.String.check(
  Schema.makeFilter(isXaiUrl, { title: "XaiUrl", description: "an HTTPS URL on x.ai" }),
)

/** The xAI sign-in endpoints, read from the issuer's OpenID configuration. */
export class OAuthEndpoints extends Schema.Class<OAuthEndpoints>("OAuthEndpoints")({
  deviceAuthorization: XaiUrl,
  token: XaiUrl,
  revocation: Schema.Option(XaiUrl),
}) {}

/** A device code waiting for the user to approve it in the browser. */
export class DeviceCode extends Schema.Class<DeviceCode>("DeviceCode")({
  deviceCode: Schema.Redacted(Schema.String),
  userCode: Schema.String,
  verificationUri: XaiUrl,
  /** The verification URL with the code already filled in, when the server sends one. */
  verificationUriComplete: Schema.Option(XaiUrl),
  /** Seconds until the device code expires. */
  expiresIn: Schema.Finite,
  /** Seconds to wait between token polls. */
  interval: Schema.Finite,
}) {
  /** Where to send the user: the prefilled URL when there is one. */
  get browserUrl(): string {
    return Option.getOrElse(this.verificationUriComplete, () => this.verificationUri)
  }
}

const OpenIdConfiguration = Schema.Struct({
  device_authorization_endpoint: Schema.OptionFromOptionalKey(XaiUrl),
  token_endpoint: XaiUrl,
  revocation_endpoint: Schema.OptionFromOptionalKey(XaiUrl),
})

const DeviceCodeResponse = Schema.Struct({
  device_code: Schema.NonEmptyString,
  user_code: Schema.NonEmptyString,
  verification_uri: XaiUrl,
  verification_uri_complete: Schema.OptionFromOptionalKey(XaiUrl),
  expires_in: Schema.OptionFromOptionalKey(Schema.Finite),
  interval: Schema.OptionFromOptionalKey(Schema.Finite),
})

/** A token endpoint response. The tokens are redacted so they never reach a log or an error message. */
export const TokenResponse = Schema.Struct({
  access_token: Schema.RedactedFromValue(Schema.NonEmptyString),
  refresh_token: Schema.OptionFromOptionalKey(Schema.RedactedFromValue(Schema.NonEmptyString)),
  id_token: Schema.OptionFromOptionalKey(Schema.RedactedFromValue(Schema.NonEmptyString)),
  expires_in: Schema.OptionFromOptionalKey(Schema.Finite),
})
export type TokenResponse = typeof TokenResponse.Type

const OAuthErrorBody = Schema.Struct({
  error: Schema.NonEmptyString,
  error_description: Schema.OptionFromOptionalKey(Schema.NonEmptyString),
})

const isOk = (status: number): boolean => status >= 200 && status < 300

/** Send a request. A network failure or an error status becomes an `OAuthError`. */
const send = Effect.fn("oauth.send")(function* (
  request: HttpClientRequest.HttpClientRequest,
  failure: string,
) {
  const client = yield* HttpClient.HttpClient
  const response = yield* client
    .execute(request)
    .pipe(
      Effect.mapError(
        () => new OAuthError({ code: "network_error", message: failure, status: Option.none() }),
      ),
    )
  if (isOk(response.status)) return response
  const body = yield* HttpClientResponse.schemaBodyJson(OAuthErrorBody)(response).pipe(
    Effect.option,
  )
  return yield* new OAuthError({
    code: Option.match(body, { onNone: () => "http_error", onSome: (parsed) => parsed.error }),
    message: body.pipe(
      Option.flatMap((parsed) => parsed.error_description),
      Option.getOrElse(() => `${failure} (HTTP ${response.status}).`),
    ),
    status: Option.some(response.status),
  })
})

/** Decode a JSON response body. A body that does not match fails with `code`. */
const decodeBody = <S extends Schema.Decoder<unknown>>(schema: S, code: string, message: string) =>
  Effect.fn("oauth.decodeBody")(function* (response: HttpClientResponse.HttpClientResponse) {
    return yield* HttpClientResponse.schemaBodyJson(schema)(response).pipe(
      Effect.mapError(
        () => new OAuthError({ code, message, status: Option.some(response.status) }),
      ),
    )
  })

const postForm = (url: string, form: Readonly<Record<string, string>>) =>
  HttpClientRequest.post(url).pipe(
    HttpClientRequest.acceptJson,
    HttpClientRequest.bodyUrlParams(form),
  )

export const discoverEndpoints = Effect.fn("oauth.discoverEndpoints")(function* (issuer: string) {
  const response = yield* send(
    HttpClientRequest.get(`${issuer}/.well-known/openid-configuration`).pipe(
      HttpClientRequest.acceptJson,
    ),
    "Could not reach xAI sign-in",
  ).pipe(
    Effect.mapError(
      (error) =>
        new OAuthError({ code: "discovery_failed", message: error.message, status: error.status }),
    ),
  )
  const config = yield* decodeBody(
    OpenIdConfiguration,
    "invalid_discovery",
    "xAI sign-in returned an unexpected configuration.",
  )(response)
  return new OAuthEndpoints({
    deviceAuthorization: Option.getOrElse(
      config.device_authorization_endpoint,
      () => `${issuer}/oauth2/device/code`,
    ),
    token: config.token_endpoint,
    revocation: config.revocation_endpoint,
  })
})

export const requestDeviceCode = Effect.fn("oauth.requestDeviceCode")(function* (
  endpoints: OAuthEndpoints,
  clientId: string,
) {
  const response = yield* send(
    postForm(endpoints.deviceAuthorization, {
      client_id: clientId,
      scope: XAI_SCOPES,
      referrer: REFERRER,
    }),
    "Could not start xAI sign-in",
  )
  const body = yield* decodeBody(
    DeviceCodeResponse,
    "invalid_device_code",
    "xAI sign-in returned an incomplete device code.",
  )(response)
  return new DeviceCode({
    deviceCode: Redacted.make(body.device_code),
    userCode: body.user_code,
    verificationUri: body.verification_uri,
    verificationUriComplete: body.verification_uri_complete,
    expiresIn: Option.getOrElse(body.expires_in, () => 900),
    interval: Option.getOrElse(body.interval, () => 5),
  })
})

const readTokenResponse = decodeBody(
  TokenResponse,
  "invalid_token_response",
  "xAI sign-in returned no access token.",
)

const exchangeDeviceCode = Effect.fn("oauth.exchangeDeviceCode")(function* (
  endpoints: OAuthEndpoints,
  clientId: string,
  device: DeviceCode,
) {
  const response = yield* send(
    postForm(endpoints.token, {
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      device_code: Redacted.value(device.deviceCode),
      client_id: clientId,
    }),
    "xAI sign-in failed",
  )
  return yield* readTokenResponse(response)
})

/**
 * Poll the token endpoint until the user approves the device code in the browser.
 * Follows RFC 8628: wait `interval` seconds, add 5 seconds on `slow_down`, and stop on
 * `access_denied`, `expired_token`, or when the code's lifetime has passed.
 */
export const pollDeviceToken = Effect.fn("oauth.pollDeviceToken")(function* (
  endpoints: OAuthEndpoints,
  clientId: string,
  device: DeviceCode,
) {
  const poll = (
    interval: Duration.Duration,
  ): Effect.Effect<TokenResponse, OAuthError, HttpClient.HttpClient> =>
    Effect.sleep(interval).pipe(
      Effect.andThen(exchangeDeviceCode(endpoints, clientId, device)),
      Effect.catchTag("OAuthError", (error) =>
        Match.value(error.code).pipe(
          Match.when("authorization_pending", () => poll(interval)),
          Match.when("slow_down", () => poll(Duration.sum(interval, Duration.seconds(5)))),
          Match.orElse(() => Effect.fail(error)),
        ),
      ),
    )
  return yield* poll(Duration.seconds(device.interval)).pipe(
    Effect.timeoutOrElse({
      duration: Duration.seconds(device.expiresIn),
      orElse: () =>
        Effect.fail(
          new OAuthError({
            code: "expired_token",
            message: "The sign-in code expired. Start sign-in again.",
            status: Option.none(),
          }),
        ),
    }),
  )
})

export const refreshTokens = Effect.fn("oauth.refreshTokens")(function* (
  endpoints: OAuthEndpoints,
  clientId: string,
  refreshToken: Redacted.Redacted<string>,
) {
  const response = yield* send(
    postForm(endpoints.token, {
      grant_type: "refresh_token",
      refresh_token: Redacted.value(refreshToken),
      client_id: clientId,
    }),
    "Could not refresh the Grok sign-in",
  )
  return yield* readTokenResponse(response)
})

/** Revoke a token. Does nothing when the server has no revocation endpoint. */
export const revokeToken = Effect.fn("oauth.revokeToken")(function* (
  endpoints: OAuthEndpoints,
  clientId: string,
  token: Redacted.Redacted<string>,
) {
  if (Option.isNone(endpoints.revocation)) return
  yield* send(
    postForm(endpoints.revocation.value, {
      token: Redacted.value(token),
      client_id: clientId,
    }),
    "Could not revoke the Grok sign-in",
  )
})

/** Who is signed in, from the ID token's claims. For display only. */
export class Profile extends Schema.Class<Profile>("Profile")({
  name: Schema.OptionFromOptionalKey(Schema.String),
  email: Schema.OptionFromOptionalKey(Schema.String),
}) {
  static readonly unknown = new Profile({ name: Option.none(), email: Option.none() })
}

const decodeProfile = Schema.decodeUnknownOption(Schema.fromJsonString(Profile))

/** The name and email in an ID token. The token is not verified, so show them only. */
export const profileFromIdToken = (idToken: Option.Option<Redacted.Redacted<string>>): Profile =>
  idToken.pipe(
    Option.flatMap((token) => Arr.get(Redacted.value(token).split("."), 1)),
    Option.flatMap((payload) => Result.getSuccess(Base64Url.decodeString(payload))),
    Option.flatMap(decodeProfile),
    Option.getOrElse(() => Profile.unknown),
  )

/** The OAuth client ID. Raycast reads it from the extension preferences. */
export class ClientId extends Context.Service<ClientId, string>()("grok/ClientId") {}

const makeXaiEndpoints = Effect.fn("XaiEndpoints.make")(function* () {
  const client = yield* HttpClient.HttpClient
  const cache = yield* Ref.make(Option.none<OAuthEndpoints>())
  const discover = discoverEndpoints(XAI_ISSUER).pipe(
    Effect.provideService(HttpClient.HttpClient, client),
    Effect.tap((endpoints) => Ref.set(cache, Option.some(endpoints))),
  )
  // Only a successful discovery is kept, so a failed one is retried on the next use.
  const get = Ref.get(cache).pipe(
    Effect.flatMap(Option.match({ onNone: () => discover, onSome: Effect.succeed })),
  )
  return XaiEndpoints.of({ get })
})

/** The xAI sign-in endpoints, discovered on first use and then reused. */
export class XaiEndpoints extends Context.Service<
  XaiEndpoints,
  { readonly get: Effect.Effect<OAuthEndpoints, OAuthError> }
>()("grok/XaiEndpoints") {
  static readonly layer = Layer.effect(XaiEndpoints, makeXaiEndpoints())
}
