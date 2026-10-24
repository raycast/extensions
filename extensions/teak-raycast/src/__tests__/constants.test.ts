import { describe, expect, mock, test } from "bun:test";
import { createRaycastApiMock } from "./raycastApiMock";

mock.module("@raycast/api", () => createRaycastApiMock(true));

const loadLocalConstants = () =>
  import(`../lib/constants?local=${crypto.randomUUID()}`);

describe("raycast local constants", () => {
  test("uses the canonical local app URL in development", async () => {
    const { TEAK_DEV_APP_URL, TEAK_SETTINGS_URL } = await loadLocalConstants();
    expect(TEAK_DEV_APP_URL).toBe("http://localhost:3000");
    expect(TEAK_SETTINGS_URL).toBe("http://localhost:3000/settings");
  });

  test("uses the canonical Convex API URL in development", async () => {
    const { getApiBaseUrl } = await loadLocalConstants();
    expect(getApiBaseUrl()).toBe(
      "https://reminiscent-kangaroo-59.convex.site/v1",
    );
  });

  test("builds local card URLs from the local app origin", async () => {
    const { getTeakCardUrl } = await loadLocalConstants();
    expect(getTeakCardUrl("card_123")).toBe(
      "http://localhost:3000/?card=card_123",
    );
  });
});
