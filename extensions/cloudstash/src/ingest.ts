import { Effect } from "effect";

import { AuthError, ConnectionError, InvalidUrlError, ServerError, ValidationError } from "./errors";
import { AuthService, HttpService, PreferencesService } from "./services";

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export const validateUrl = (input: string): Effect.Effect<string, InvalidUrlError> =>
  Effect.try({
    try: () => {
      new URL(input);
      return input;
    },
    catch: () => new InvalidUrlError({ _tag: "InvalidUrlError", input }),
  });

const sendIngestRequest = (
  url: string,
  apiKey: string,
): Effect.Effect<Response, ConnectionError, HttpService | PreferencesService> =>
  Effect.gen(function* () {
    const http = yield* HttpService;
    const prefs = yield* PreferencesService;
    const serverUrl = prefs.serverUrl.replace(/\/$/, "");

    return yield* Effect.tryPromise({
      try: () =>
        http.fetch(`${serverUrl}/api/ingest`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
        }),
      catch: () =>
        new ConnectionError({
          _tag: "ConnectionError",
          message: "Network error — check your connection",
        }),
    });
  });

const handleResponse = (
  response: Response,
  url: string,
): Effect.Effect<{ status: string; domain: string }, ValidationError | ServerError> =>
  Effect.gen(function* () {
    if (response.status === 400) {
      const error = yield* Effect.tryPromise({
        try: () => response.json() as Promise<{ error?: string }>,
        catch: () =>
          new ValidationError({
            _tag: "ValidationError",
            message: "Bad request",
          }),
      });
      return yield* new ValidationError({
        _tag: "ValidationError",
        message: error.error || "Invalid request",
      });
    }

    if (!response.ok) {
      return yield* new ServerError({
        _tag: "ServerError",
        url,
        statusCode: response.status,
      });
    }

    const result = yield* Effect.tryPromise({
      try: () => response.json() as Promise<{ status: string }>,
      catch: () =>
        new ValidationError({
          _tag: "ValidationError",
          message: "Invalid response",
        }),
    });

    return { status: result.status, domain: getDomain(url) };
  });

export const saveUrl = (
  url: string,
): Effect.Effect<
  { status: string; domain: string },
  AuthError | ConnectionError | ValidationError | ServerError,
  AuthService | HttpService | PreferencesService
> =>
  Effect.gen(function* () {
    const auth = yield* AuthService;

    const apiKey = yield* Effect.tryPromise({
      try: () => auth.getApiKey(),
      catch: () => new AuthError({ _tag: "AuthError" }),
    });

    const response = yield* sendIngestRequest(url, apiKey);

    if (response.status === 401) {
      yield* Effect.promise(() => auth.clearApiKey());

      const newApiKey = yield* Effect.tryPromise({
        try: () => auth.getApiKey(),
        catch: () => new AuthError({ _tag: "AuthError" }),
      });

      const retryResponse = yield* sendIngestRequest(url, newApiKey);
      return yield* handleResponse(retryResponse, url);
    }

    return yield* handleResponse(response, url);
  });
