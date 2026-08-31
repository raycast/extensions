import { describe, expect, test } from "vitest";
import {
  jumpseatConfigurationId,
  resolveJumpseatConfiguration,
} from "./config-values";

describe("Jumpseat endpoint configuration", () => {
  test("accepts and normalizes the production endpoint pair", () => {
    const configuration = resolveJumpseatConfiguration(
      " https://api.withjumpseat.com/ ",
      "https://app.withjumpseat.com/",
    );

    expect(configuration).toEqual({
      apiBaseUrl: "https://api.withjumpseat.com",
      webBaseUrl: "https://app.withjumpseat.com",
    });
    expect(jumpseatConfigurationId(configuration)).toBe(
      "https://api.withjumpseat.com\nhttps://app.withjumpseat.com",
    );
  });

  test("rejects loopback endpoint pairs", () => {
    expect(() =>
      resolveJumpseatConfiguration(
        "http://127.0.0.1:3001",
        "http://localhost:3000",
      ),
    ).toThrow(/official Jumpseat/);
    expect(() =>
      resolveJumpseatConfiguration("http://[::1]:3001", "http://[::1]:3000"),
    ).toThrow(/official Jumpseat/);
  });

  test("rejects mixed, arbitrary, and path-based endpoint pairs", () => {
    expect(() =>
      resolveJumpseatConfiguration(
        "https://api.withjumpseat.com",
        "http://localhost:3000",
      ),
    ).toThrow(/official Jumpseat/);
    expect(() =>
      resolveJumpseatConfiguration(
        "https://evil.example",
        "https://evil.example",
      ),
    ).toThrow(/official Jumpseat/);
    expect(() =>
      resolveJumpseatConfiguration(
        "https://api.withjumpseat.com/proxy",
        "https://app.withjumpseat.com",
      ),
    ).toThrow(/without a path/);
  });
});
