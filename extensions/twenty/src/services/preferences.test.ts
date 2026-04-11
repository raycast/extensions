import { describe, expect, test } from "vitest";

import { buildTwentyConfig, normalizeTwentyBaseUrl } from "./preferences";

describe("normalizeTwentyBaseUrl", () => {
  test("returns the hosted Twenty URL for empty input", () => {
    expect(normalizeTwentyBaseUrl("")).toBe("https://app.twenty.com");
  });

  test("normalizes a self-hosted rest URL", () => {
    expect(normalizeTwentyBaseUrl("https://twenty.example.com/rest/")).toBe("https://twenty.example.com");
  });

  test("rejects inputs that are not full URLs", () => {
    expect(() => normalizeTwentyBaseUrl("twenty.local")).toThrowError(/full URL/i);
  });
});

describe("buildTwentyConfig", () => {
  test("builds the typed preference config", () => {
    expect(
      buildTwentyConfig({
        token: "secret-token",
        url: "https://twenty.example.com/rest/",
        object_creation_form_behaviour: true,
      }),
    ).toEqual({
      token: "secret-token",
      authHeader: "Bearer secret-token",
      baseUrl: "https://twenty.example.com",
      restBaseUrl: "https://twenty.example.com/rest",
      keepObjectFormOpen: true,
    });
  });
});
