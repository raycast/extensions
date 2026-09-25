import { describe, expect, it } from "vitest";
import {
  buildAuthorizationCodeExchangeRequest,
  buildAuthorizationRequestPlan,
  buildRefreshRequest,
  isDefinitiveOAuthTokenFailure,
  isCentralOAuthAuthorizationServer,
  oauthEndpoint,
  oauthForm,
  resolveStoredAuthProtocol,
} from "./oauth-protocol";

const configuration = {
  apiBaseUrl: "https://api.withjumpseat.com",
  webBaseUrl: "https://app.withjumpseat.com",
  authBaseUrl: "https://auth.withjumpseat.com",
};

describe("Jumpseat OAuth protocol", () => {
  it("uses the standard endpoints on the central auth authority", () => {
    expect(
      oauthEndpoint(
        "https://auth.withjumpseat.com",
        "/oauth/authorize",
      ).toString(),
    ).toBe("https://auth.withjumpseat.com/oauth/authorize");
    expect(
      oauthEndpoint("https://auth.withjumpseat.com", "/oauth/token").toString(),
    ).toBe("https://auth.withjumpseat.com/oauth/token");
    expect(
      oauthEndpoint(
        "https://auth.withjumpseat.com",
        "/oauth/revoke",
      ).toString(),
    ).toBe("https://auth.withjumpseat.com/oauth/revoke");
  });

  it("accepts only the exact central authorization-server metadata", () => {
    expect(
      isCentralOAuthAuthorizationServer(
        {
          issuer: "https://auth.withjumpseat.com",
          authorization_endpoint:
            "https://auth.withjumpseat.com/oauth/authorize",
          token_endpoint: "https://auth.withjumpseat.com/oauth/token",
        },
        configuration.authBaseUrl,
      ),
    ).toBe(true);
    expect(
      isCentralOAuthAuthorizationServer(
        {
          issuer: "https://auth.withjumpseat.com",
          authorization_endpoint:
            "https://auth.withjumpseat.com/oauth/authorize",
          token_endpoint: "https://elsewhere.example/oauth/token",
        },
        configuration.authBaseUrl,
      ),
    ).toBe(false);
  });

  it("keeps central resource binding out of released authorization requests", () => {
    expect(buildAuthorizationRequestPlan(configuration, "legacy")).toEqual({
      endpoint: "https://app.withjumpseat.com/connect/raycast",
      clientId: "jumpseat-raycast",
      scope: "flights:upcoming:read",
    });
    expect(buildAuthorizationRequestPlan(configuration, "central")).toEqual({
      endpoint: "https://auth.withjumpseat.com/oauth/authorize",
      clientId: "jumpseat-raycast",
      scope: "flights:upcoming:read",
      extraParameters: { resource: "https://api.withjumpseat.com" },
    });
  });

  it("exchanges central and released authorization codes at their matching endpoints", () => {
    const input = {
      code: "code",
      redirectUri: "https://raycast.com/redirect?packageName=Extension",
      codeVerifier: "verifier",
    };
    expect(
      buildAuthorizationCodeExchangeRequest(configuration, "legacy", input),
    ).toEqual({
      url: new URL("https://api.withjumpseat.com/api/v1/auth/oauth/token"),
      contentType: "application/json",
      body: JSON.stringify({
        grant_type: "authorization_code",
        code: "code",
        client_id: "jumpseat-raycast",
        redirect_uri: "https://raycast.com/redirect?packageName=Extension",
        code_verifier: "verifier",
      }),
    });
    expect(
      buildAuthorizationCodeExchangeRequest(configuration, "central", input),
    ).toMatchObject({
      url: new URL("https://auth.withjumpseat.com/oauth/token"),
      contentType: "application/x-www-form-urlencoded",
      body: expect.stringContaining(
        "resource=https%3A%2F%2Fapi.withjumpseat.com",
      ),
    });
  });

  it("encodes standard OAuth form fields", () => {
    expect(
      oauthForm({
        grant_type: "refresh_token",
        refresh_token: "refresh value",
        resource: "https://api.withjumpseat.com",
      }),
    ).toBe(
      "grant_type=refresh_token&refresh_token=refresh+value&resource=https%3A%2F%2Fapi.withjumpseat.com",
    );
  });

  it("requires a definitive refresh rejection for each protocol", () => {
    expect(isDefinitiveOAuthTokenFailure(401, null, "legacy")).toBe(true);
    expect(isDefinitiveOAuthTokenFailure(401, null, "central")).toBe(false);
    expect(
      isDefinitiveOAuthTokenFailure(
        401,
        { error: "invalid_client" },
        "central",
      ),
    ).toBe(false);
    for (const protocol of ["legacy", "central"] as const) {
      expect(
        isDefinitiveOAuthTokenFailure(
          400,
          { error: "invalid_grant" },
          protocol,
        ),
      ).toBe(true);
      expect(
        isDefinitiveOAuthTokenFailure(400, { code: "invalid_grant" }, protocol),
      ).toBe(true);
      expect(
        isDefinitiveOAuthTokenFailure(
          429,
          { error: "invalid_grant" },
          protocol,
        ),
      ).toBe(false);
      expect(
        isDefinitiveOAuthTokenFailure(
          500,
          { error: "invalid_grant" },
          protocol,
        ),
      ).toBe(false);
    }
  });

  it("keeps released credentials on the legacy authority until reauthorized", () => {
    expect(
      resolveStoredAuthProtocol(
        "https://api.withjumpseat.com\nhttps://app.withjumpseat.com",
        undefined,
        configuration,
      ),
    ).toBe("legacy");
    expect(
      resolveStoredAuthProtocol(
        "https://api.withjumpseat.com\nhttps://app.withjumpseat.com",
        "central",
        configuration,
      ),
    ).toBe("legacy");
    expect(
      resolveStoredAuthProtocol(
        "https://api.withjumpseat.com",
        "central",
        configuration,
      ),
    ).toBe("central");
  });

  it("refreshes legacy and central grants at their issuing authorities", () => {
    expect(buildRefreshRequest(configuration, "refresh", "legacy")).toEqual({
      url: new URL("https://api.withjumpseat.com/api/v1/auth/refresh"),
      contentType: "application/json",
      body: JSON.stringify({ refreshToken: "refresh" }),
    });
    expect(buildRefreshRequest(configuration, "refresh", "central")).toEqual({
      url: new URL("https://auth.withjumpseat.com/oauth/token"),
      contentType: "application/x-www-form-urlencoded",
      body: "grant_type=refresh_token&refresh_token=refresh&client_id=jumpseat-raycast&resource=https%3A%2F%2Fapi.withjumpseat.com",
    });
    expect(
      buildRefreshRequest(
        {
          ...configuration,
          authBaseUrl: "https://auth-previous.withjumpseat.com",
        },
        "refresh",
        "central",
      ),
    ).toMatchObject({
      url: new URL("https://auth-previous.withjumpseat.com/oauth/token"),
    });
  });
});
