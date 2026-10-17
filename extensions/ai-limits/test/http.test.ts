import { describe, expect, it } from "vitest";
import { fakeDeps, fakeJwt, NOW } from "./fake-deps";
import {
  asArray,
  asNumber,
  asRecord,
  asString,
  asTimestamp,
  clampPercent,
  decodeJwtPayload,
  requestJson,
  retryDelayMs,
  titleCase,
} from "../src/lib/http";
import { ProviderError } from "../src/lib/types";

const URL = "https://api.example.test/usage";
const CHALLENGE_HTML = "<!DOCTYPE html><html><title>Just a moment...</title><body>cf-chl-bypass</body></html>";

// Resolves with the error thrown by requestJson, or fails the test when it resolves.
async function failureOf(promise: Promise<unknown>): Promise<ProviderError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ProviderError);
    return error as ProviderError;
  }
  throw new Error("expected requestJson to throw");
}

describe("requestJson", () => {
  it("sends GET with an Accept header by default and parses a JSON answer", async () => {
    const deps = fakeDeps({ routes: [{ prefix: URL, respond: { body: { ok: true } } }] });

    const json = await requestJson(deps, URL, { provider: "Test" });

    expect(json).toEqual({ ok: true });
    expect(deps.requests).toHaveLength(1);
    expect(deps.requests[0]).toMatchObject({ url: URL, method: "GET" });
    expect(deps.requests[0].headers.accept).toBe("application/json");
    expect(deps.requests[0].body).toBeUndefined();
    expect(deps.requests[0].headers["content-type"]).toBeUndefined();
  });

  it("sends an object body as JSON with a JSON Content-Type", async () => {
    const deps = fakeDeps({ routes: [{ prefix: URL, method: "POST", respond: { body: {} } }] });

    await requestJson(deps, URL, { provider: "Test", method: "POST", body: { query: "limits", days: 7 } });

    expect(deps.requests[0].method).toBe("POST");
    expect(deps.requests[0].body).toBe('{"query":"limits","days":7}');
    expect(deps.requests[0].headers["content-type"]).toBe("application/json");
  });

  it("sends a string body as-is and does not force a JSON Content-Type", async () => {
    const deps = fakeDeps({ routes: [{ prefix: URL, method: "POST", respond: { body: {} } }] });

    await requestJson(deps, URL, {
      provider: "Test",
      method: "POST",
      body: "grant_type=refresh_token&client_id=abc",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    expect(deps.requests[0].body).toBe("grant_type=refresh_token&client_id=abc");
    expect(deps.requests[0].headers["content-type"]).toBe("application/x-www-form-urlencoded");
  });

  it("sends a string body without any Content-Type when the caller set none", async () => {
    const deps = fakeDeps({ routes: [{ prefix: URL, method: "POST", respond: { body: {} } }] });

    await requestJson(deps, URL, { provider: "Test", method: "POST", body: "raw" });

    expect(deps.requests[0].body).toBe("raw");
    expect(deps.requests[0].headers["content-type"]).toBeUndefined();
  });

  it("passes caller headers through alongside Accept", async () => {
    const deps = fakeDeps({ routes: [{ prefix: URL, respond: { body: [] } }] });

    await requestJson(deps, URL, {
      provider: "Test",
      headers: { Authorization: "Bearer abc", "User-Agent": "AI-Limits-Raycast" },
    });

    expect(deps.requests[0].headers).toMatchObject({
      accept: "application/json",
      authorization: "Bearer abc",
      "user-agent": "AI-Limits-Raycast",
    });
  });

  it.each([401, 403])("throws an auth error with the hint and status on HTTP %i", async (status) => {
    const deps = fakeDeps({ routes: [{ prefix: URL, respond: { status, body: { error: "nope" } } }] });

    const error = await failureOf(
      requestJson(deps, URL, { provider: "Claude", authHint: "Sign in again", headers: {} }),
    );

    expect(error.kind).toBe("auth");
    expect(error.message).toBe(`Claude rejected the credentials (HTTP ${status})`);
    expect(error.hint).toBe("Sign in again");
    expect(error.status).toBe(status);
  });

  it("keeps a plain 403 JSON answer as an auth error even when the body mentions a challenge", async () => {
    const deps = fakeDeps({
      routes: [
        {
          prefix: URL,
          respond: {
            status: 403,
            headers: { "content-type": "application/json" },
            body: { error: "challenge_required" },
          },
        },
      ],
    });

    const error = await failureOf(requestJson(deps, URL, { provider: "Codex" }));

    expect(error).toMatchObject({ kind: "auth", status: 403 });
  });

  it("reports a Cloudflare challenge marked by the cf-mitigated header as an http error, not auth", async () => {
    const deps = fakeDeps({
      routes: [{ prefix: URL, respond: { status: 403, headers: { "cf-mitigated": "challenge" }, body: "" } }],
    });

    const error = await failureOf(requestJson(deps, URL, { provider: "Codex", authHint: "Sign in again" }));

    expect(error.kind).toBe("http");
    expect(error.status).toBe(403);
    expect(error.message).toContain("blocked the request with a bot check");
    // The hint is for expired logins, which this is not, so it is left out.
    expect(error.hint).toBeUndefined();
  });

  it("reports an HTML challenge page as an http error, not auth", async () => {
    const deps = fakeDeps({
      routes: [
        {
          prefix: URL,
          respond: { status: 403, headers: { "content-type": "text/html; charset=UTF-8" }, body: CHALLENGE_HTML },
        },
      ],
    });

    const error = await failureOf(requestJson(deps, URL, { provider: "Claude", authHint: "Sign in again" }));

    expect(error).toMatchObject({ kind: "http", status: 403 });
  });

  it("detects an HTML challenge by its body even without a text/html Content-Type", async () => {
    const deps = fakeDeps({
      routes: [{ prefix: URL, respond: { status: 403, body: `  ${CHALLENGE_HTML}` } }],
    });

    const error = await failureOf(requestJson(deps, URL, { provider: "Claude" }));

    expect(error).toMatchObject({ kind: "http", status: 403 });
  });

  it("does not treat a plain HTML 403 without a challenge marker as a bot check", async () => {
    const deps = fakeDeps({
      routes: [
        {
          prefix: URL,
          respond: {
            status: 403,
            headers: { "content-type": "text/html" },
            body: "<html><body>Forbidden for this account</body></html>",
          },
        },
      ],
    });

    const error = await failureOf(requestJson(deps, URL, { provider: "Claude" }));

    expect(error.kind).toBe("auth");
  });

  it("throws an http error with the status on a 500", async () => {
    const deps = fakeDeps({ routes: [{ prefix: URL, respond: { status: 500, body: { error: "boom" } } }] });

    const error = await failureOf(requestJson(deps, URL, { provider: "OpenRouter", authHint: "unused" }));

    expect(error).toMatchObject({ kind: "http", message: "OpenRouter returned HTTP 500", status: 500 });
    expect(error.hint).toBeUndefined();
  });

  it("throws an http error with no status when the request never gets an answer", async () => {
    // No route matches, so the fake fetch rejects the way a dropped connection does.
    const deps = fakeDeps();

    const error = await failureOf(requestJson(deps, URL, { provider: "Kimi" }));

    expect(error.kind).toBe("http");
    expect(error.message).toMatch(/^Couldn't reach Kimi: /);
    expect(error.status).toBeUndefined();
  });

  it("throws an http error with the status and when the provider allows the next request on a 429", async () => {
    const deps = fakeDeps({
      routes: [{ prefix: URL, respond: { status: 429, headers: { "Retry-After": "120" }, body: {} } }],
    });

    const error = await failureOf(requestJson(deps, URL, { provider: "Claude", authHint: "Sign in again" }));

    expect(error).toMatchObject({
      kind: "http",
      message: "Claude is rate limiting requests (HTTP 429)",
      hint: "The extension waits 2 min before asking Claude again",
      status: 429,
      retryAt: NOW + 120_000,
    });
  });

  it("reads an HTTP-date Retry-After on a 429 as the time to wait until", async () => {
    const deps = fakeDeps({
      routes: [
        {
          prefix: URL,
          respond: { status: 429, headers: { "Retry-After": new Date(NOW + 90_000).toUTCString() }, body: {} },
        },
      ],
    });

    const error = await failureOf(requestJson(deps, URL, { provider: "Claude" }));

    expect(error).toMatchObject({ kind: "http", status: 429, retryAt: NOW + 90_000 });
  });

  it("waits five minutes on a 429 that has no Retry-After", async () => {
    const deps = fakeDeps({ routes: [{ prefix: URL, respond: { status: 429, body: {} } }] });

    const error = await failureOf(requestJson(deps, URL, { provider: "Claude" }));

    expect(error.retryAt).toBe(NOW + 5 * 60_000);
    expect(error.hint).toBe("The extension waits 5 min before asking Claude again");
  });

  it("caps a 429 Retry-After at one hour", async () => {
    const deps = fakeDeps({
      routes: [{ prefix: URL, respond: { status: 429, headers: { "Retry-After": "86400" }, body: {} } }],
    });

    const error = await failureOf(requestJson(deps, URL, { provider: "Claude" }));

    expect(error.retryAt).toBe(NOW + 60 * 60_000);
    expect(error.hint).toBe("The extension waits 60 min before asking Claude again");
  });

  it("throws a parse error when a 200 answer is not JSON", async () => {
    const deps = fakeDeps({ routes: [{ prefix: URL, respond: { body: "<html>maintenance</html>" } }] });

    const error = await failureOf(requestJson(deps, URL, { provider: "Gemini" }));

    expect(error).toMatchObject({ kind: "parse", message: "Gemini returned a response that isn't JSON" });
    expect(error.status).toBeUndefined();
  });
});

describe("retryDelayMs", () => {
  it("reads a number of seconds", () => {
    expect(retryDelayMs("60", NOW)).toBe(60_000);
    expect(retryDelayMs(" 30 ", NOW)).toBe(30_000);
  });

  it("reads an HTTP date as the time from now until that date", () => {
    expect(retryDelayMs(new Date(NOW + 10 * 60_000).toUTCString(), NOW)).toBe(10 * 60_000);
  });

  it.each<[string | null, string]>([
    [null, "no header"],
    ["", "an empty header"],
    ["0", "zero seconds"],
    ["soon", "text that is not a date"],
    [new Date(NOW - 60_000).toUTCString(), "a date already past"],
  ])("gives the five minute default for %s (%s)", (header) => {
    expect(retryDelayMs(header, NOW)).toBe(5 * 60_000);
  });

  it("caps a date more than an hour away", () => {
    expect(retryDelayMs(new Date(NOW + 3 * 60 * 60_000).toUTCString(), NOW)).toBe(60 * 60_000);
  });
});

describe("asRecord", () => {
  it("returns plain objects and rejects arrays, null and scalars", () => {
    expect(asRecord({ a: 1 })).toEqual({ a: 1 });
    expect(asRecord({})).toEqual({});
    expect(asRecord([])).toBeUndefined();
    expect(asRecord(null)).toBeUndefined();
    expect(asRecord(undefined)).toBeUndefined();
    expect(asRecord("text")).toBeUndefined();
    expect(asRecord(5)).toBeUndefined();
  });
});

describe("asArray", () => {
  it("returns arrays and an empty list for anything else", () => {
    expect(asArray([1, "two"])).toEqual([1, "two"]);
    expect(asArray({ length: 2 })).toEqual([]);
    expect(asArray(null)).toEqual([]);
    expect(asArray("text")).toEqual([]);
  });
});

describe("asString", () => {
  it("trims text and rejects blanks and non-strings", () => {
    expect(asString("  hello  ")).toBe("hello");
    expect(asString("   ")).toBeUndefined();
    expect(asString("")).toBeUndefined();
    expect(asString(42)).toBeUndefined();
    expect(asString(null)).toBeUndefined();
  });
});

describe("asNumber", () => {
  it.each([
    [0, 0],
    [-2.5, -2.5],
    ["42", 42],
    [" 7.5 ", 7.5],
    ["1e3", 1000],
  ])("reads %j as %j", (input, expected) => {
    expect(asNumber(input)).toBe(expected);
  });

  it.each<[unknown, string]>([
    ["", "empty string"],
    ["   ", "blank string"],
    ["abc", "non-numeric string"],
    [NaN, "NaN"],
    [Infinity, "Infinity"],
    ["Infinity", "Infinity as a string"],
    [null, "null"],
    [true, "boolean"],
    [undefined, "undefined"],
  ])("returns undefined for %s", (input) => {
    expect(asNumber(input)).toBeUndefined();
  });
});

describe("asTimestamp", () => {
  it("parses ISO strings to epoch milliseconds", () => {
    expect(asTimestamp("2026-10-14T15:00:00Z")).toBe(Date.parse("2026-10-14T15:00:00Z"));
    expect(asTimestamp("2026-10-14T15:00:00.000000+00:00")).toBe(Date.parse("2026-10-14T15:00:00Z"));
  });

  it("treats numbers below 1e12 as epoch seconds and larger ones as milliseconds", () => {
    expect(asTimestamp(1760450000)).toBe(1760450000 * 1000);
    expect(asTimestamp(1760450000000)).toBe(1760450000000);
    expect(asTimestamp(999_999_999_999)).toBe(999_999_999_999 * 1000);
  });

  it("reads numeric strings the same way as numbers", () => {
    expect(asTimestamp("1760450000")).toBe(1760450000 * 1000);
    expect(asTimestamp("1760450000000")).toBe(1760450000000);
  });

  it.each([0, -5, "0", "-5", NaN, Infinity, "", "not a date", null, undefined, {}])("returns null for %j", (input) => {
    expect(asTimestamp(input)).toBeNull();
  });

  it("uses the fixed clock value when converting a known reset time", () => {
    // Guards the seconds/milliseconds boundary against the test clock used elsewhere.
    expect(asTimestamp(NOW / 1000)).toBe(NOW);
  });
});

describe("clampPercent", () => {
  it.each([
    [-5, 0],
    [0, 0],
    [42.5, 42.5],
    [100, 100],
    [150, 100],
  ])("clamps %j to %j", (input, expected) => {
    expect(clampPercent(input)).toBe(expected);
  });
});

describe("titleCase", () => {
  it.each([
    ["pro_plus", "Pro Plus"],
    ["free-tier", "Free Tier"],
    ["  spaced  words ", "Spaced Words"],
    ["enterprise", "Enterprise"],
    ["ENTERPRISE", "Enterprise"],
    ["", ""],
  ])("turns %j into %j", (input, expected) => {
    expect(titleCase(input)).toBe(expected);
  });
});

describe("decodeJwtPayload", () => {
  it("reads the payload of a token", () => {
    const token = fakeJwt({
      email: "omar@example.com",
      "https://api.openai.com/auth": { chatgpt_account_id: "acct_1" },
    });

    expect(decodeJwtPayload(token)).toEqual({
      email: "omar@example.com",
      "https://api.openai.com/auth": { chatgpt_account_id: "acct_1" },
    });
  });

  it("returns undefined when there is no payload part", () => {
    expect(decodeJwtPayload("not-a-jwt")).toBeUndefined();
    expect(decodeJwtPayload("header..signature")).toBeUndefined();
  });

  it("returns undefined when the payload is not base64 JSON", () => {
    expect(decodeJwtPayload("header.%%%not-base64%%%.signature")).toBeUndefined();
    expect(decodeJwtPayload("header.bm90IGpzb24.signature")).toBeUndefined(); // "not json"
  });

  it("returns undefined when the payload is JSON but not an object", () => {
    const array = Buffer.from(JSON.stringify([1, 2])).toString("base64url");

    expect(decodeJwtPayload(`header.${array}.signature`)).toBeUndefined();
  });
});
