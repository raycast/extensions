import { describe, expect, it } from "vitest";
import { fakeDeps } from "./fake-deps";
import { exchangeOpenRouterCode, openRouterAuthUrl } from "../src/lib/openrouter-auth";
import { ProviderError } from "../src/lib/types";

const EXCHANGE_URL = "https://openrouter.ai/api/v1/auth/keys";
// What Raycast hands the extension: the redirect page with the package name already in its query.
const REDIRECT = "https://raycast.com/redirect?packageName=Extension";

describe("openRouterAuthUrl", () => {
  it("points at the OpenRouter approval page with the PKCE challenge", () => {
    const url = new URL(openRouterAuthUrl({ redirectURI: REDIRECT, state: "state-1", codeChallenge: "challenge-1" }));
    expect(`${url.origin}${url.pathname}`).toBe("https://openrouter.ai/auth");
    expect(url.searchParams.get("code_challenge")).toBe("challenge-1");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("adds the state to the callback next to the package name", () => {
    const url = new URL(openRouterAuthUrl({ redirectURI: REDIRECT, state: "state-1", codeChallenge: "c" }));
    expect(url.searchParams.get("callback_url")).toBe(
      "https://raycast.com/redirect?packageName=Extension&state=state-1",
    );
  });

  it("encodes the callback so it stays one parameter", () => {
    const raw = openRouterAuthUrl({ redirectURI: REDIRECT, state: "state-1", codeChallenge: "c" });
    expect(raw).toContain(
      "callback_url=https%3A%2F%2Fraycast.com%2Fredirect%3FpackageName%3DExtension%26state%3Dstate-1",
    );
  });

  it("encodes a state with reserved characters without changing its value", () => {
    const state = "a b&c=d/e?f";
    const url = new URL(openRouterAuthUrl({ redirectURI: REDIRECT, state, codeChallenge: "c" }));
    const callback = new URL(url.searchParams.get("callback_url") ?? "");
    expect(callback.searchParams.get("packageName")).toBe("Extension");
    expect(callback.searchParams.get("state")).toBe(state);
  });

  it("encodes the challenge, which can contain characters that need escaping", () => {
    const challenge = "abc+def/ghi=";
    const url = new URL(openRouterAuthUrl({ redirectURI: REDIRECT, state: "s", codeChallenge: challenge }));
    expect(url.searchParams.get("code_challenge")).toBe(challenge);
  });

  it("adds the state when the redirect has no query at all", () => {
    const url = new URL(
      openRouterAuthUrl({ redirectURI: "https://example.test/callback", state: "s", codeChallenge: "c" }),
    );
    expect(url.searchParams.get("callback_url")).toBe("https://example.test/callback?state=s");
  });
});

describe("exchangeOpenRouterCode", () => {
  it("posts the code and verifier and returns the key", async () => {
    const deps = fakeDeps({
      routes: [{ prefix: EXCHANGE_URL, method: "POST", respond: { body: { key: "sk-or-v1-new-key" } } }],
    });

    const key = await exchangeOpenRouterCode(deps, "code-123", "verifier-456");

    expect(key).toBe("sk-or-v1-new-key");
    expect(deps.requests).toHaveLength(1);
    const [request] = deps.requests;
    expect(request.url).toBe(EXCHANGE_URL);
    expect(request.method).toBe("POST");
    expect(request.headers["content-type"]).toBe("application/json");
    expect(JSON.parse(request.body ?? "")).toEqual({
      code: "code-123",
      code_verifier: "verifier-456",
      code_challenge_method: "S256",
    });
  });

  it("trims the key it returns", async () => {
    const deps = fakeDeps({
      routes: [{ prefix: EXCHANGE_URL, method: "POST", respond: { body: { key: "  sk-or-v1-padded  " } } }],
    });
    expect(await exchangeOpenRouterCode(deps, "code", "verifier")).toBe("sk-or-v1-padded");
  });

  it("throws an http error when OpenRouter refuses the code", async () => {
    const deps = fakeDeps({
      routes: [{ prefix: EXCHANGE_URL, method: "POST", respond: { status: 400, body: { error: "bad code" } } }],
    });

    const error = await exchangeOpenRouterCode(deps, "stale-code", "verifier").catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toMatchObject({ kind: "http", status: 400, message: "OpenRouter returned HTTP 400" });
  });

  it("throws an auth error when OpenRouter answers 401", async () => {
    const deps = fakeDeps({
      routes: [{ prefix: EXCHANGE_URL, method: "POST", respond: { status: 401, body: { error: "nope" } } }],
    });

    await expect(exchangeOpenRouterCode(deps, "code", "verifier")).rejects.toMatchObject({ kind: "auth", status: 401 });
  });

  it("throws a parse error when the answer has no key", async () => {
    const deps = fakeDeps({
      routes: [{ prefix: EXCHANGE_URL, method: "POST", respond: { body: { user_id: "u_1" } } }],
    });

    await expect(exchangeOpenRouterCode(deps, "code", "verifier")).rejects.toMatchObject({ kind: "parse" });
  });

  it("throws a parse error when the key is not a non-empty string", async () => {
    for (const key of [42, "   ", null, { value: "sk-or-v1" }]) {
      const deps = fakeDeps({ routes: [{ prefix: EXCHANGE_URL, method: "POST", respond: { body: { key } } }] });
      await expect(exchangeOpenRouterCode(deps, "code", "verifier")).rejects.toMatchObject({ kind: "parse" });
    }
  });
});
