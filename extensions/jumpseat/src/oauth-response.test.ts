import { describe, expect, it } from "vitest";
import {
  parseOAuthTokenResponse,
  parseRefreshResponse,
} from "./oauth-response";

describe("OAuth response parsing", () => {
  it("accepts the Jumpseat authorization-code token response", () => {
    expect(
      parseOAuthTokenResponse({
        access_token: "access",
        refresh_token: "refresh",
        token_type: "Bearer",
        expires_in: 3600,
        scope: "flights:upcoming:read",
      }),
    ).toEqual({
      access_token: "access",
      refresh_token: "refresh",
      expires_in: 3600,
      scope: "flights:upcoming:read",
    });
  });

  it("rejects incomplete token responses", () => {
    expect(parseOAuthTokenResponse({ access_token: "access" })).toBeNull();
    expect(parseRefreshResponse({ accessToken: "access" })).toBeNull();
  });

  it("rejects malformed or non-bearer credentials", () => {
    expect(
      parseOAuthTokenResponse({
        access_token: "access",
        refresh_token: "refresh",
        token_type: "Basic",
        expires_in: 3600,
        scope: "flights:upcoming:read",
      }),
    ).toBeNull();
    expect(
      parseRefreshResponse({
        accessToken: " access ",
        refreshToken: "refresh",
        expiresIn: -1,
      }),
    ).toBeNull();
  });

  it("accepts rotated Jumpseat refresh credentials", () => {
    expect(
      parseRefreshResponse({
        userId: "user-id",
        handle: "captain",
        accessToken: "access-2",
        refreshToken: "refresh-2",
        expiresIn: 3600,
      }),
    ).toEqual({
      accessToken: "access-2",
      refreshToken: "refresh-2",
      expiresIn: 3600,
    });
  });
});
