import { describe, expect, it } from "vitest";
import {
  KATO_OAUTH_SCOPE,
  hasRequiredOAuthScopes,
  katoApiBaseUrl,
  katoOAuthEndpoints,
} from "../src/oauth-config";

describe("Kato OAuth endpoints", () => {
  it("keeps development authorization and token exchange on local services", () => {
    expect(katoOAuthEndpoints(true)).toEqual({
      authorizeUrl: "http://localhost:3001/oauth/authorize",
      tokenUrl: "http://localhost:3000/oauth/token",
    });
  });

  it("uses the public Kato origins in Store builds", () => {
    expect(katoOAuthEndpoints(false)).toEqual({
      authorizeUrl: "https://app.getkato.io/oauth/authorize",
      tokenUrl: "https://api.getkato.io/oauth/token",
    });
  });

  it("keeps API requests on the same environment as OAuth", () => {
    expect(katoApiBaseUrl(true)).toBe("http://localhost:3000/v1/raycast");
    expect(katoApiBaseUrl(false)).toBe(
      "https://api.getkato.io/v1/raycast",
    );
  });

  it("requires users to reconnect when a new permission is introduced", () => {
    expect(hasRequiredOAuthScopes(KATO_OAUTH_SCOPE)).toBe(true);
    expect(
      hasRequiredOAuthScopes(
        "tasks:read tasks:write records:read objects:read meetings:read",
      ),
    ).toBe(false);
  });
});
