import { afterEach, describe, expect, mock, test } from "bun:test";

mock.module("@raycast/api", () => ({
  environment: { isDevelopment: true },
}));

const loadLocalConstants = () =>
  import(`../lib/constants?local=${crypto.randomUUID()}`);

describe("raycast local constants", () => {
  test("uses the canonical portless app URL in development", async () => {
    const { TEAK_DEV_APP_URL, TEAK_SETTINGS_URL } = await loadLocalConstants();
    expect(TEAK_DEV_APP_URL).toBe("http://app.teak.localhost:1355");
    expect(TEAK_SETTINGS_URL).toBe("http://app.teak.localhost:1355/settings");
  });

  test("uses the canonical portless API URL in development", async () => {
    const { getApiBaseUrl } = await loadLocalConstants();
    expect(getApiBaseUrl()).toBe("https://api.teak.localhost:1355/v1");
  });

  test("builds local card URLs from the portless app origin", async () => {
    const { getTeakCardUrl } = await loadLocalConstants();
    expect(getTeakCardUrl("card_123")).toBe(
      "http://app.teak.localhost:1355/?card=card_123",
    );
  });
});

describe("raycast OAuth token base URL", () => {
  const originalTokenEnv = process.env.TEAK_DEV_CONVEX_SITE_URL;
  const originalSiteEnv = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;

  const restoreEnv = (key: string, value: string | undefined) => {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  };

  afterEach(() => {
    restoreEnv("TEAK_DEV_CONVEX_SITE_URL", originalTokenEnv);
    restoreEnv("NEXT_PUBLIC_CONVEX_SITE_URL", originalSiteEnv);
    // Restore the file-level development mock for any following tests.
    mock.module("@raycast/api", () => ({
      environment: { isDevelopment: true },
    }));
  });

  test("ignores NEXT_PUBLIC_CONVEX_SITE_URL and uses the default deployment", async () => {
    delete process.env.TEAK_DEV_CONVEX_SITE_URL;
    // A Vercel-pulled .env.local may point this at a stale deployment; the
    // token URL must not follow it.
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL =
      "https://uncommon-ladybug-882.convex.site";

    const { getOAuthTokenBaseUrl } = await loadLocalConstants();
    expect(getOAuthTokenBaseUrl()).toBe(
      "https://reminiscent-kangaroo-59.convex.site",
    );
  });

  test("prefers TEAK_DEV_CONVEX_SITE_URL and normalizes it", async () => {
    process.env.TEAK_DEV_CONVEX_SITE_URL =
      "https://override.convex.site/path?tab=1#frag";

    const { getOAuthTokenBaseUrl } = await loadLocalConstants();
    expect(getOAuthTokenBaseUrl()).toBe("https://override.convex.site");
  });

  test("uses the default dev Convex site when no env override is set", async () => {
    delete process.env.TEAK_DEV_CONVEX_SITE_URL;
    delete process.env.NEXT_PUBLIC_CONVEX_SITE_URL;

    const { getOAuthTokenBaseUrl } = await loadLocalConstants();
    expect(getOAuthTokenBaseUrl()).toBe(
      "https://reminiscent-kangaroo-59.convex.site",
    );
  });

  test("uses the production app origin outside development", async () => {
    mock.module("@raycast/api", () => ({
      environment: { isDevelopment: false },
    }));

    const { getOAuthTokenBaseUrl } = await loadLocalConstants();
    expect(getOAuthTokenBaseUrl()).toBe("https://app.teakvault.com");
  });
});
