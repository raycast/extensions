import { describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  getPreferenceValues: vi.fn(() => ({ apiToken: "sk_cdn_test123" })),
}));

import { getPreferenceValues } from "@raycast/api";
import { getApiToken } from "./preferences";

const mockedGetPreferenceValues = vi.mocked(getPreferenceValues);

describe("getApiToken", () => {
  it("returns the apiToken preference value", () => {
    expect(getApiToken()).toBe("sk_cdn_test123");
  });

  it("returns an empty string, not undefined, when apiToken is absent from preferences", () => {
    mockedGetPreferenceValues.mockReturnValueOnce({} as ReturnType<typeof getPreferenceValues>);
    expect(getApiToken()).toBe("");
  });
});
