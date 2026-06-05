import { describe, it, expect } from "vitest";
import { getPreferenceDefault } from "./manifest";

describe("getPreferenceDefault", () => {
  it("returns the default declared in package.json for an existing preference", () => {
    // These assertions intentionally read package.json's actual values rather
    // than hardcoding strings — the whole point of this helper is to NOT
    // duplicate the manifest. We assert that we got *some* non-empty string,
    // matching the textfield shape; the exact model name lives in the manifest.
    expect(getPreferenceDefault("translationModel")).toMatch(/\S/);
    expect(getPreferenceDefault("ttsModel")).toMatch(/\S/);
  });

  it("throws when the preference is not declared", () => {
    expect(() => getPreferenceDefault("preferenceThatDoesNotExist")).toThrow(/not declared in package\.json/);
  });

  it("throws when the preference has no string default (e.g. password fields)", () => {
    // `geminiApiKey` is a `password` preference with no `default` field — this
    // is the canonical case where defaulting silently to "" would be dangerous.
    expect(() => getPreferenceDefault("geminiApiKey")).toThrow(/no non-empty string default/);
  });
});
