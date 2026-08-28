import { describe, expect, it, vi } from "vitest";
import {
  isJwtExpired,
  isMalformedStoredSessionError,
  userFacingAuthMessage,
  userFromAccessToken,
} from "./oauth-helpers";

function makeJwt(payload: object): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${encoded}.sig`;
}

describe("oauth helpers", () => {
  it("detects expired jwt using the provided buffer", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T12:00:00.000Z"));

    const token = makeJwt({ exp: Math.floor(Date.now() / 1000) + 30 });

    expect(isJwtExpired(token, 60_000)).toBe(true);
    vi.useRealTimers();
  });

  it("extracts the user id and email from an access token", () => {
    const token = makeJwt({ sub: "user-123", email: "test@nibit.app" });

    expect(userFromAccessToken(token)).toEqual({
      id: "user-123",
      email: "test@nibit.app",
    });
  });

  it("identifies malformed stored session errors", () => {
    expect(isMalformedStoredSessionError(new Error("Unable to decode Nibit session."))).toBe(true);
    expect(isMalformedStoredSessionError(new Error("Nibit session is missing a user id."))).toBe(true);
    expect(isMalformedStoredSessionError(new Error("Something else"))).toBe(false);
  });

  it("maps cancellation-like errors to a user-facing auth message", () => {
    expect(userFacingAuthMessage(new Error("user canceled flow"), "fallback")).toBe("Nibit sign-in was canceled.");
    expect(userFacingAuthMessage(new Error("other"), "fallback")).toBe("fallback");
  });
});
