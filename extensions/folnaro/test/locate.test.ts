import { describe, expect, it } from "vitest";
import { locateHelper } from "../src/lib/locate";

const fs = (paths: string[], executable = paths) => ({
  exists: (path: string) => paths.includes(path),
  isExecutable: (path: string) => executable.includes(path),
  home: "/Users/demo",
});

describe("locateHelper", () => {
  it("finds the helper in /Applications", () => {
    const helper = "/Applications/Folnaro.app/Contents/MacOS/folnaro-mcp";
    expect(locateHelper(fs(["/Applications/Folnaro.app", helper]))).toEqual({
      command: helper,
      args: [],
      appPath: "/Applications/Folnaro.app",
    });
  });

  it("falls back to ~/Applications and then to Spotlight", () => {
    const home = "/Users/demo/Applications/Folnaro.app";
    expect(locateHelper(fs([home, `${home}/Contents/MacOS/folnaro-mcp`])).appPath).toBe(home);
    const elsewhere = "/Volumes/Apps/Folnaro.app";
    const found = locateHelper({
      ...fs([elsewhere, `${elsewhere}/Contents/MacOS/folnaro-mcp`]),
      spotlightPaths: () => [elsewhere],
    });
    expect(found.appPath).toBe(elsewhere);
  });

  it("says Folnaro is not installed when no app is found", () => {
    expect(() => locateHelper(fs([]))).toThrowError(expect.objectContaining({ kind: "appNotInstalled" }));
  });

  it("says the helper is missing when the app has none", () => {
    expect(() => locateHelper(fs(["/Applications/Folnaro.app"]))).toThrowError(
      expect.objectContaining({ kind: "helperMissing" }),
    );
    const helper = "/Applications/Folnaro.app/Contents/MacOS/folnaro-mcp";
    expect(() => locateHelper(fs(["/Applications/Folnaro.app", helper], []))).toThrowError(
      expect.objectContaining({ kind: "helperMissing" }),
    );
  });

  it("runs a script override with Node, for the mock helper", () => {
    const script = "/repo/test/mock-mcp-server.mjs";
    expect(locateHelper({ ...fs([script]), overridePath: script, nodePath: "/node" })).toEqual({
      command: "/node",
      args: [script],
    });
    expect(() => locateHelper({ ...fs([]), overridePath: "~/folnaro-mcp" })).toThrowError(
      expect.objectContaining({ kind: "helperMissing" }),
    );
  });
});
