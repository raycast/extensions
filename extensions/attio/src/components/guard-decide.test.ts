import { describe, expect, it } from "vitest";
import { AttioApiError, AttioNetworkError } from "../api/errors";
import { decide, type GuardInput } from "./guard-decide";

const base: GuardInput = {
  selfIsActive: true,
  selfIsLoading: false,
  selfError: undefined,
  missing: [],
  error: undefined,
  hasLiveData: false,
};

describe("decide — precedence is the spec §6 table, top to bottom", () => {
  it("1: loading while self unresolved", () => {
    expect(decide({ ...base, selfIsActive: undefined, selfIsLoading: true }).kind).toBe("loading");
  });
  it("2: live data + any error → stale (toast, keep screen)", () => {
    expect(
      decide({ ...base, hasLiveData: true, error: new AttioApiError(429, "rate_limit_error", "x", "x") }).kind,
    ).toBe("stale");
  });
  it("3: network beats auth", () => {
    expect(decide({ ...base, error: new AttioNetworkError("down") }).kind).toBe("network");
  });
  it("4: 403 auth_error → auth; inactive token → auth", () => {
    expect(decide({ ...base, error: new AttioApiError(403, "auth_error", "unauthorized", "x") }).kind).toBe("auth");
    expect(decide({ ...base, selfIsActive: false }).kind).toBe("auth");
  });
  it("5: missing scopes fire with NO error (pre-flight)", () => {
    const d = decide({ ...base, missing: ["note:read"] });
    expect(d).toEqual({ kind: "scopes", missing: ["note:read"] });
  });
  it("6: rate limited carries retryAfterMs", () => {
    const d = decide({ ...base, error: new AttioApiError(429, "rate_limit_error", "rate_limit_exceeded", "x", 1500) });
    expect(d).toEqual({ kind: "rate-limited", retryAfterMs: 1500 });
  });
  it("7: other API errors surface code+message", () => {
    const d = decide({ ...base, error: new AttioApiError(409, "invalid_request_error", "slug_conflict", "taken") });
    expect(d.kind).toBe("api-error");
  });
  it("8: no error, scopes fine → render", () => {
    expect(decide(base).kind).toBe("render");
  });
  it("generic non-Attio errors still get a screen, not a blank list", () => {
    expect(decide({ ...base, error: new Error("boom") }).kind).toBe("api-error");
  });
  it("9: /v2/self 400 invalid_request_error (bogus token) → auth, not a crash", () => {
    const d = decide({
      ...base,
      selfError: new AttioApiError(400, "invalid_request_error", "missing_value", "Token was not recognised"),
    });
    expect(d.kind).toBe("auth");
  });
  it("10: network selfError still beats auth (precedence unchanged)", () => {
    expect(decide({ ...base, selfError: new AttioNetworkError("down") }).kind).toBe("network");
  });
  it("11: temporary /v2/self failures never read as a rejected token", () => {
    expect(decide({ ...base, selfError: new AttioApiError(429, "rate_limit_error", "x", "slow down", 900) })).toEqual({
      kind: "rate-limited",
      retryAfterMs: 900,
    });
    expect(decide({ ...base, selfError: new AttioApiError(500, "server_error", "x", "boom") }).kind).toBe("api-error");
    expect(decide({ ...base, selfError: new AttioApiError(503, "server_error", "x", "down") }).kind).toBe("api-error");
  });
  it("12: simultaneous errors — a temporary self failure beats a data-fetch error", () => {
    const dataErr = new AttioApiError(404, "not_found_error", "missing", "gone");
    expect(
      decide({ ...base, error: dataErr, selfError: new AttioApiError(429, "rate_limit_error", "x", "x") }).kind,
    ).toBe("rate-limited");
    expect(
      decide({ ...base, error: dataErr, selfError: new AttioApiError(503, "server_error", "x", "down") }).kind,
    ).toBe("api-error");
  });
});
