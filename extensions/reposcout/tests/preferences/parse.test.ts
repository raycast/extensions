import { describe, expect, it } from "vitest";
import { resolvePreferences } from "../../src/preferences/parse";

const home = "/Users/tester";

describe("resolvePreferences", () => {
  it("applies defaults for empty input", () => {
    const prefs = resolvePreferences({}, home);
    // No search roots by default — scanning is opt-in (ADR-010).
    expect(prefs.discovery.roots).toEqual([]);
    expect(prefs.discovery.maxDepth).toBe(8);
    expect(prefs.discovery.followSymlinks).toBe(false);
    expect(prefs.discovery.includeBareRepos).toBe(true);
    expect(prefs.primaryEditor).toBe("vscode");
    expect(prefs.terminalApp).toBe("Terminal");
    expect(prefs.discovery.ignoredDirectories.has("node_modules")).toBe(true);
  });

  it("does not fall back to the home directory when roots are blank", () => {
    expect(resolvePreferences({ searchRoots: "   " }, home).discovery.roots).toEqual([]);
    expect(resolvePreferences({ searchRoots: "" }, home).discovery.roots).toEqual([]);
  });

  it("resolves a single explicit root", () => {
    expect(resolvePreferences({ searchRoots: "~/code" }, home).discovery.roots).toEqual([
      "/Users/tester/code",
    ]);
  });

  it("expands and splits multiple search roots", () => {
    const prefs = resolvePreferences({ searchRoots: "~/code, ~/work\n/opt/src" }, home);
    expect(prefs.discovery.roots).toEqual(["/Users/tester/code", "/Users/tester/work", "/opt/src"]);
  });

  it("clamps maxDepth into the allowed range", () => {
    expect(resolvePreferences({ maxDepth: "0" }, home).discovery.maxDepth).toBe(1);
    expect(resolvePreferences({ maxDepth: "999" }, home).discovery.maxDepth).toBe(32);
    expect(resolvePreferences({ maxDepth: "notanumber" }, home).discovery.maxDepth).toBe(8);
  });

  it("parses ignored directories into a set", () => {
    const prefs = resolvePreferences({ ignoredDirectories: "foo, bar,foo" }, home);
    expect([...prefs.discovery.ignoredDirectories].sort()).toEqual(["bar", "foo"]);
  });

  it("validates the editor selection", () => {
    expect(resolvePreferences({ primaryEditor: "cursor" }, home).primaryEditor).toBe("cursor");
    expect(resolvePreferences({ primaryEditor: "emacs" }, home).primaryEditor).toBe("vscode");
  });

  it("honors boolean toggles", () => {
    const prefs = resolvePreferences({ followSymlinks: true, includeBareRepos: false }, home);
    expect(prefs.discovery.followSymlinks).toBe(true);
    expect(prefs.discovery.includeBareRepos).toBe(false);
  });

  it("falls back to the default terminal when blank", () => {
    expect(resolvePreferences({ terminalApp: "   " }, home).terminalApp).toBe("Terminal");
    expect(resolvePreferences({ terminalApp: "iTerm" }, home).terminalApp).toBe("iTerm");
  });
});
