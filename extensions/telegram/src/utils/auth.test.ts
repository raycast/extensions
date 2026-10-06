import { describe, it, expect } from "vitest";
import { getConfig } from "./auth";
import { __setPreferencesMock } from "../../test/raycast-api.stub";

describe("getConfig", () => {
  it("parses valid preferences", () => {
    __setPreferencesMock({
      apiId: "123456",
      apiHash: "abcdef1234567890",
    });

    const config = getConfig();
    expect(config).toEqual({
      apiId: 123456,
      apiHash: "abcdef1234567890",
    });
  });

  it("trims whitespace from credentials", () => {
    __setPreferencesMock({
      apiId: "  987654  ",
      apiHash: "  hash123  ",
    });

    const config = getConfig();
    expect(config).toEqual({
      apiId: 987654,
      apiHash: "hash123",
    });
  });

  it("throws when apiId is missing or invalid", () => {
    __setPreferencesMock({
      apiId: "",
      apiHash: "hash",
    });
    expect(() => getConfig()).toThrow("API ID is required");

    __setPreferencesMock({
      apiId: "abc",
      apiHash: "hash",
    });
    expect(() => getConfig()).toThrow("Invalid API ID");
  });

  it("throws when apiHash is missing", () => {
    __setPreferencesMock({
      apiId: "123",
      apiHash: "   ",
    });
    expect(() => getConfig()).toThrow("API Hash is required");
  });
});
