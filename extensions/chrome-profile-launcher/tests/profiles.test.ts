import { describe, expect, it } from "vitest";
import type { ChromeProfile } from "../src/types";
import { pickName, sortByChromeOrder } from "../src/lib/chrome-profiles";

describe("pickName", () => {
  it("prefers the info_cache name above all", () => {
    expect(pickName("Profile 1", { name: "Work" }, "PrefsName")).toBe("Work");
  });

  it("falls back to the Preferences name when info_cache name is absent", () => {
    expect(pickName("Profile 1", {}, "PrefsName")).toBe("PrefsName");
  });

  it("falls back through gaia_name, then user_name, then directory", () => {
    expect(pickName("Profile 1", { gaia_name: "Jane" }, undefined)).toBe("Jane");
    expect(pickName("Profile 1", { user_name: "jane@example.com" }, undefined)).toBe("jane@example.com");
    expect(pickName("Profile 1", {}, undefined)).toBe("Profile 1");
  });

  it("uses the directory when a broken Preferences read yields undefined and nothing else is present", () => {
    // A malformed/unreadable Preferences file is modeled as `undefined`.
    expect(pickName("Andy", {}, undefined)).toBe("Andy");
  });

  it("ignores blank / whitespace-only names and non-string junk", () => {
    expect(pickName("Profile 1", { name: "   " }, undefined)).toBe("Profile 1");
    expect(pickName("Profile 1", { name: 42 as unknown as string }, undefined)).toBe("Profile 1");
  });
});

describe("sortByChromeOrder", () => {
  const make = (directory: string, name: string): ChromeProfile => ({
    directory,
    name,
    colorSource: "chrome",
    isDefault: directory === "Default",
  });

  it("orders by profiles_order, then appends unlisted profiles alphabetically", () => {
    const profiles = [make("Profile 2", "B"), make("Default", "D"), make("Zeta", "Z"), make("Alpha", "A")];
    const order = ["Default", "Profile 2"];
    expect(sortByChromeOrder(profiles, order).map((p) => p.directory)).toEqual(["Default", "Profile 2", "Alpha", "Zeta"]);
  });

  it("is a no-op ordering when profiles_order is empty (pure alphabetical)", () => {
    const profiles = [make("Profile 2", "Beta"), make("Profile 1", "Alpha")];
    expect(sortByChromeOrder(profiles, []).map((p) => p.name)).toEqual(["Alpha", "Beta"]);
  });
});
