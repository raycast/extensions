import { describe, expect, test } from "vitest";
import { getJumpseatConfiguration } from "./config";
import { jumpseatConfigurationId } from "./config-values";

describe("Jumpseat endpoint configuration", () => {
  test("uses only the fixed production endpoint pair", () => {
    const configuration = getJumpseatConfiguration();

    expect(configuration).toEqual({
      apiBaseUrl: "https://api.withjumpseat.com",
      webBaseUrl: "https://app.withjumpseat.com",
    });
    expect(jumpseatConfigurationId(configuration)).toBe(
      "https://api.withjumpseat.com\nhttps://app.withjumpseat.com",
    );
  });
});
