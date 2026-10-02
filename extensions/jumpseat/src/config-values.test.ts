import { describe, expect, test } from "vitest";
import { getJumpseatConfiguration } from "./config";
import {
  getProductionJumpseatConfiguration,
  isCompatibleJumpseatConfigurationId,
  isLegacyJumpseatConfigurationId,
  jumpseatConfigurationId,
  normalizeOAuthOrigin,
  resolveStoredCentralOAuthIssuer,
  trustedOAuthOrigins,
} from "./config-values";

describe("Jumpseat endpoint configuration", () => {
  test("uses only the fixed production API, web, and OAuth origins", () => {
    const configuration = getJumpseatConfiguration();

    expect(configuration).toEqual({
      apiBaseUrl: "https://api.withjumpseat.com",
      webBaseUrl: "https://app.withjumpseat.com",
      authBaseUrl: "https://auth.withjumpseat.com",
    });
    expect(jumpseatConfigurationId(configuration)).toBe(
      "https://api.withjumpseat.com",
    );
  });

  test("keeps stored credentials when only the OAuth authority changes", () => {
    const configuration = getJumpseatConfiguration();

    expect(
      isCompatibleJumpseatConfigurationId(
        "https://api.withjumpseat.com\nhttps://app.withjumpseat.com",
        configuration,
      ),
    ).toBe(true);
    expect(
      isCompatibleJumpseatConfigurationId(
        "https://api.withjumpseat.com",
        configuration,
      ),
    ).toBe(true);
    expect(
      isCompatibleJumpseatConfigurationId(
        "https://other-api.example",
        configuration,
      ),
    ).toBe(false);
    expect(
      isLegacyJumpseatConfigurationId(
        "https://api.withjumpseat.com\nhttps://app.withjumpseat.com",
      ),
    ).toBe(true);
  });

  test("permits a deployment-controlled OAuth authority override", () => {
    expect(
      getProductionJumpseatConfiguration({
        JUMPSEAT_AUTH_ORIGIN: "https://auth-staging.withjumpseat.com/",
      }).authBaseUrl,
    ).toBe("https://auth-staging.withjumpseat.com");
  });

  test("only trusts canonical, current, and explicitly migrated OAuth origins", () => {
    const configuration = getProductionJumpseatConfiguration({
      JUMPSEAT_AUTH_ORIGIN: "https://auth-next.withjumpseat.com",
    });
    const env = {
      JUMPSEAT_TRUSTED_AUTH_ORIGINS:
        "https://auth-previous.withjumpseat.com, https://auth-other.withjumpseat.com/",
    };

    expect([...trustedOAuthOrigins(configuration, env)]).toEqual([
      "https://auth.withjumpseat.com",
      "https://auth-next.withjumpseat.com",
      "https://auth-previous.withjumpseat.com",
      "https://auth-other.withjumpseat.com",
    ]);
    expect(
      resolveStoredCentralOAuthIssuer(
        "https://auth-previous.withjumpseat.com",
        configuration,
        env,
      ),
    ).toBe("https://auth-previous.withjumpseat.com");
    expect(
      resolveStoredCentralOAuthIssuer(
        "https://untrusted.example",
        configuration,
        env,
      ),
    ).toBeUndefined();
  });

  test("rejects unsafe OAuth origin forms and only recovers missing metadata on canonical auth", () => {
    for (const unsafeOrigin of [
      "http://auth.withjumpseat.com",
      "https://user:pass@auth.withjumpseat.com",
      "https://auth.withjumpseat.com/oauth",
      "https://auth.withjumpseat.com?next=elsewhere",
      "https://auth.withjumpseat.com:8443",
    ]) {
      expect(normalizeOAuthOrigin(unsafeOrigin)).toBeUndefined();
    }

    expect(
      resolveStoredCentralOAuthIssuer(
        undefined,
        getProductionJumpseatConfiguration(),
      ),
    ).toBe("https://auth.withjumpseat.com");
    expect(
      resolveStoredCentralOAuthIssuer(
        undefined,
        getProductionJumpseatConfiguration({
          JUMPSEAT_AUTH_ORIGIN: "https://auth-next.withjumpseat.com",
        }),
      ),
    ).toBeUndefined();
  });
});
