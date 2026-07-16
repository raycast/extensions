import { describe, expect, it } from "vitest";
import { resolvePreferences } from "../../src/preferences/parse";

const home = "/Users/tester";

/** Build a full `Preferences` object (as Raycast delivers it) with overrides. */
function prefs(overrides: Partial<Preferences> = {}): Preferences {
  return {
    searchRoots: "",
    maxDepth: "8",
    ignoredDirectories: "",
    followSymlinks: false,
    includeBareRepos: true,
    primaryEditor: "vscode",
    terminalApp: "Terminal",
    ...overrides,
  };
}

describe("resolvePreferences", () => {
  it("applies defaults for empty free-text input", () => {
    const resolved = resolvePreferences(prefs({ searchRoots: "", maxDepth: "", ignoredDirectories: "" }), home);
    // No search roots by default — scanning is opt-in (ADR-010).
    expect(resolved.discovery.roots).toEqual([]);
    expect(resolved.discovery.maxDepth).toBe(8);
    expect(resolved.discovery.followSymlinks).toBe(false);
    expect(resolved.discovery.includeBareRepos).toBe(true);
    expect(resolved.primaryEditor).toBe("vscode");
    expect(resolved.terminalApp).toBe("Terminal");
    expect(resolved.discovery.ignoredDirectories.has("node_modules")).toBe(true);
  });

  it("does not fall back to the home directory when roots are blank", () => {
    expect(resolvePreferences(prefs({ searchRoots: "   " }), home).discovery.roots).toEqual([]);
    expect(resolvePreferences(prefs({ searchRoots: "" }), home).discovery.roots).toEqual([]);
  });

  it("resolves a single explicit root", () => {
    expect(resolvePreferences(prefs({ searchRoots: "~/code" }), home).discovery.roots).toEqual(["/Users/tester/code"]);
  });

  it("expands and splits multiple search roots", () => {
    const resolved = resolvePreferences(prefs({ searchRoots: "~/code, ~/work\n/opt/src" }), home);
    expect(resolved.discovery.roots).toEqual(["/Users/tester/code", "/Users/tester/work", "/opt/src"]);
  });

  it("clamps maxDepth into the allowed range", () => {
    expect(resolvePreferences(prefs({ maxDepth: "0" }), home).discovery.maxDepth).toBe(1);
    expect(resolvePreferences(prefs({ maxDepth: "999" }), home).discovery.maxDepth).toBe(32);
    expect(resolvePreferences(prefs({ maxDepth: "notanumber" }), home).discovery.maxDepth).toBe(8);
  });

  it("parses ignored directories into a set", () => {
    const resolved = resolvePreferences(prefs({ ignoredDirectories: "foo, bar,foo" }), home);
    expect([...resolved.discovery.ignoredDirectories].sort()).toEqual(["bar", "foo"]);
  });

  it("passes through the selected editor", () => {
    expect(resolvePreferences(prefs({ primaryEditor: "cursor" }), home).primaryEditor).toBe("cursor");
    expect(resolvePreferences(prefs({ primaryEditor: "vscode" }), home).primaryEditor).toBe("vscode");
  });

  it("passes through the selected terminal", () => {
    expect(resolvePreferences(prefs({ terminalApp: "iTerm" }), home).terminalApp).toBe("iTerm");
  });

  it("honors boolean toggles", () => {
    const resolved = resolvePreferences(prefs({ followSymlinks: true, includeBareRepos: false }), home);
    expect(resolved.discovery.followSymlinks).toBe(true);
    expect(resolved.discovery.includeBareRepos).toBe(false);
  });
});
