import { describe, expect, it } from "vitest";
import { brewTrustFile } from "./trustFile";

// Homebrew picks its user config directory in bin/brew (7.0.14, lines 165-173)
// and keeps trust.json there (trust/store.rb).
describe("brewTrustFile", () => {
  it("uses ~/.homebrew when no XDG directory is set", () => {
    expect(brewTrustFile({ HOME: "/Users/a" })).toBe("/Users/a/.homebrew/trust.json");
  });

  it("prefers XDG_CONFIG_HOME", () => {
    expect(brewTrustFile({ HOME: "/Users/a", XDG_CONFIG_HOME: "/x", HOMEBREW_XDG_CONFIG_HOME: "/y" })).toBe(
      "/x/homebrew/trust.json",
    );
  });

  it("falls back to HOMEBREW_XDG_CONFIG_HOME", () => {
    expect(brewTrustFile({ HOME: "/Users/a", HOMEBREW_XDG_CONFIG_HOME: "/y" })).toBe("/y/homebrew/trust.json");
  });

  it("ignores an empty XDG_CONFIG_HOME, as brew's -n test does", () => {
    // `[[ -n "${XDG_CONFIG_HOME-}" ]]` is false for an empty value.
    expect(brewTrustFile({ HOME: "/Users/a", XDG_CONFIG_HOME: "" })).toBe("/Users/a/.homebrew/trust.json");
  });
});
