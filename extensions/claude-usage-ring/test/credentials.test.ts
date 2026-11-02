import { describe, expect, it } from "vitest";
import { CredentialsError, parseCredentials } from "../src/lib/credentials";

describe("parseCredentials", () => {
  it("extracts only the needed fields", () => {
    const c = parseCredentials(
      JSON.stringify({
        claudeAiOauth: {
          accessToken: "a",
          refreshToken: "r",
          expiresAt: 1793649499573,
          subscriptionType: "team",
          rateLimitTier: "default_claude_max_5x",
        },
        mcpOAuth: { x: 1 },
      }),
    );
    expect(c).toEqual({
      accessToken: "a",
      expiresAt: 1793649499573,
      subscriptionType: "team",
      rateLimitTier: "default_claude_max_5x",
    });
    expect(c).not.toHaveProperty("refreshToken");
  });
  it("malformed JSON", () => {
    expect(() => parseCredentials("{")).toThrowError(expect.objectContaining({ kind: "malformed" }));
  });
  it("missing token", () => {
    expect(() => parseCredentials(JSON.stringify({ mcpOAuth: {} }))).toThrow(CredentialsError);
    expect(() => parseCredentials(JSON.stringify({ claudeAiOauth: { accessToken: "" } }))).toThrowError(
      expect.objectContaining({ kind: "not_found" }),
    );
  });
});
