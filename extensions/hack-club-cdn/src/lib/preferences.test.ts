import { describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  getPreferenceValues: vi.fn(() => ({ apiToken: "sk_cdn_test123" })),
}));

import { getApiToken } from "./preferences";

describe("getApiToken", () => {
  it("returns the apiToken preference value", () => {
    expect(getApiToken()).toBe("sk_cdn_test123");
  });
});
