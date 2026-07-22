import { describe, expect, it } from "vitest";
import type { ChromeProfile } from "../src/types";
import { resolveProfileQuery } from "../src/lib/chrome-profiles";

const make = (directory: string, name: string, email?: string): ChromeProfile => ({
  directory,
  name,
  email,
  color: "#0B57D0",
  colorSource: "chrome",
  isDefault: directory === "Default",
});

const profiles: ChromeProfile[] = [
  make("Default", "Sanjan", "sanjan@example.com"),
  make("Profile 1", "Andy", "andy1@example.com"),
  make("Profile 10", "Andy", "andy2@example.com"),
  make("Profile 2", "rescan360.com", "sanjan@rescan360.com"),
];

describe("resolveProfileQuery", () => {
  it("matches an exact directory (unique — the quicklink/hotkey path)", () => {
    expect(resolveProfileQuery(profiles, "Profile 10")?.directory).toBe("Profile 10");
    expect(resolveProfileQuery(profiles, "profile 10")?.directory).toBe("Profile 10"); // case-insensitive
  });

  it("matches an exact name, returning the first when names collide", () => {
    expect(resolveProfileQuery(profiles, "Andy")?.directory).toBe("Profile 1");
  });

  it("matches an exact email", () => {
    expect(resolveProfileQuery(profiles, "andy2@example.com")?.directory).toBe("Profile 10");
  });

  it("falls back to prefix then substring", () => {
    expect(resolveProfileQuery(profiles, "resc")?.directory).toBe("Profile 2"); // prefix on name
    expect(resolveProfileQuery(profiles, "360")?.directory).toBe("Profile 2"); // substring on name
  });

  it("returns undefined for a blank query or no match", () => {
    expect(resolveProfileQuery(profiles, "   ")).toBeUndefined();
    expect(resolveProfileQuery(profiles, "nonexistent")).toBeUndefined();
  });
});
