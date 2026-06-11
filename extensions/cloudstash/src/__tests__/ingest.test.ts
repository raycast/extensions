import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { AuthError, ConnectionError, InvalidUrlError, ServerError, ValidationError } from "../errors";
import { getDomain, saveUrl, validateUrl } from "../ingest";
import { AuthService, HttpService, PreferencesService } from "../services";

function provideTestServices(overrides: {
  getApiKey?: () => Promise<string>;
  clearApiKey?: () => Promise<void>;
  fetch?: (url: string, init: RequestInit) => Promise<Response>;
  serverUrl?: string;
}) {
  return <A, E>(effect: Effect.Effect<A, E, AuthService | HttpService | PreferencesService>): Effect.Effect<A, E> =>
    effect.pipe(
      Effect.provideService(AuthService, {
        getApiKey: overrides.getApiKey ?? (() => Promise.resolve("test-key")),
        clearApiKey: overrides.clearApiKey ?? (() => Promise.resolve()),
      }),
      Effect.provideService(HttpService, {
        fetch: overrides.fetch ?? (() => Promise.resolve(Response.json({ status: "queued" }))),
      }),
      Effect.provideService(PreferencesService, {
        serverUrl: overrides.serverUrl ?? "http://localhost:3000",
      }),
    );
}

describe("getDomain", () => {
  it("extracts domain from URL", () => {
    expect(getDomain("https://example.com/path")).toBe("example.com");
  });

  it("strips www prefix", () => {
    expect(getDomain("https://www.example.com")).toBe("example.com");
  });

  it("returns input for invalid URLs", () => {
    expect(getDomain("not-a-url")).toBe("not-a-url");
  });
});

describe("validateUrl", () => {
  it("succeeds for valid URLs", async () => {
    const result = await Effect.runPromise(validateUrl("https://example.com"));
    expect(result).toBe("https://example.com");
  });

  it("fails for invalid URLs", async () => {
    const result = await Effect.runPromise(validateUrl("not-a-url").pipe(Effect.flip));
    expect(result).toBeInstanceOf(InvalidUrlError);
    expect(result.input).toBe("not-a-url");
  });
});

describe("saveUrl", () => {
  it("returns status and domain on success", async () => {
    const result = await Effect.runPromise(
      saveUrl("https://example.com/article").pipe(
        provideTestServices({
          fetch: () => Promise.resolve(Response.json({ status: "queued" })),
        }),
      ),
    );

    expect(result).toEqual({
      status: "queued",
      domain: "example.com",
    });
  });

  it("returns duplicate status", async () => {
    const result = await Effect.runPromise(
      saveUrl("https://example.com").pipe(
        provideTestServices({
          fetch: () => Promise.resolve(Response.json({ status: "duplicate" })),
        }),
      ),
    );

    expect(result.status).toBe("duplicate");
  });

  it("sends correct request", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;

    await Effect.runPromise(
      saveUrl("https://example.com").pipe(
        provideTestServices({
          getApiKey: () => Promise.resolve("my-api-key"),
          serverUrl: "https://cloudstash.dev",
          fetch: (url, init) => {
            capturedUrl = url;
            capturedInit = init;
            return Promise.resolve(Response.json({ status: "queued" }));
          },
        }),
      ),
    );

    expect(capturedUrl).toBe("https://cloudstash.dev/api/ingest");
    expect(capturedInit?.method).toBe("POST");
    expect(capturedInit?.headers).toEqual({
      Authorization: "Bearer my-api-key",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(capturedInit?.body as string)).toEqual({
      url: "https://example.com",
    });
  });

  it("fails with AuthError when getApiKey fails", async () => {
    const error = await Effect.runPromise(
      saveUrl("https://example.com").pipe(
        provideTestServices({
          getApiKey: () => Promise.reject(new Error("not connected")),
        }),
        Effect.flip,
      ),
    );

    expect(error).toBeInstanceOf(AuthError);
  });

  it("clears key, re-auths, and retries on 401", async () => {
    let cleared = false;
    let callCount = 0;
    let keyCallCount = 0;

    const result = await Effect.runPromise(
      saveUrl("https://example.com").pipe(
        provideTestServices({
          getApiKey: () => {
            keyCallCount++;
            return Promise.resolve(keyCallCount === 1 ? "old-key" : "new-key");
          },
          clearApiKey: () => {
            cleared = true;
            return Promise.resolve();
          },
          fetch: (_url, init) => {
            callCount++;
            const headers = init.headers as Record<string, string>;
            if (headers.Authorization === "Bearer old-key") {
              return Promise.resolve(
                new Response(JSON.stringify({ error: "Unauthorized" }), {
                  status: 401,
                }),
              );
            }
            return Promise.resolve(Response.json({ status: "queued" }));
          },
        }),
      ),
    );

    expect(cleared).toBe(true);
    expect(keyCallCount).toBe(2);
    expect(callCount).toBe(2);
    expect(result).toEqual({ status: "queued", domain: "example.com" });
  });

  it("fails with AuthError when re-auth fails after 401", async () => {
    let keyCallCount = 0;

    const error = await Effect.runPromise(
      saveUrl("https://example.com").pipe(
        provideTestServices({
          getApiKey: () => {
            keyCallCount++;
            if (keyCallCount === 1) return Promise.resolve("old-key");
            return Promise.reject(new Error("auth failed"));
          },
          fetch: () =>
            Promise.resolve(
              new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
              }),
            ),
        }),
        Effect.flip,
      ),
    );

    expect(error).toBeInstanceOf(AuthError);
  });

  it("fails with ServerError on 500", async () => {
    const error = await Effect.runPromise(
      saveUrl("https://example.com").pipe(
        provideTestServices({
          fetch: () => Promise.resolve(new Response("Internal Server Error", { status: 500 })),
        }),
        Effect.flip,
      ),
    );

    expect(error).toBeInstanceOf(ServerError);
    expect((error as ServerError).url).toBe("https://example.com");
    expect((error as ServerError).statusCode).toBe(500);
  });

  it("fails with ValidationError on 400", async () => {
    const error = await Effect.runPromise(
      saveUrl("https://example.com").pipe(
        provideTestServices({
          fetch: () => Promise.resolve(Response.json({ error: "Invalid URL" }, { status: 400 })),
        }),
        Effect.flip,
      ),
    );

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).message).toBe("Invalid URL");
  });

  it("fails with ConnectionError on network error", async () => {
    const error = await Effect.runPromise(
      saveUrl("https://example.com").pipe(
        provideTestServices({
          fetch: () => Promise.reject(new Error("network down")),
        }),
        Effect.flip,
      ),
    );

    expect(error).toBeInstanceOf(ConnectionError);
  });
});
