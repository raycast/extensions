import { describe, expect, mock, test } from "bun:test";

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
    expect(getApiBaseUrl()).toBe("http://api.teak.localhost:1355/v1");
  });

  test("builds local card URLs from the portless app origin", async () => {
    const { getTeakCardUrl } = await loadLocalConstants();
    expect(getTeakCardUrl("card_123")).toBe(
      "http://app.teak.localhost:1355/?card=card_123",
    );
  });
});
