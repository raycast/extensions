import { describe, expect, it } from "vitest";
import {
  chooseApp,
  compareVersions,
  describeApp,
  getOpenWarnings,
  getRunProblem,
  GodotApp,
  isSameRelease,
  parsePlistStrings,
  parseVersion,
  ProjectInfo,
} from "../src/lib/apps";

const godot43: GodotApp = { path: "/Applications/Godot 4.3.app", name: "Godot 4.3", version: "4.3", isDotnet: false };
const godot45: GodotApp = { path: "/Applications/Godot.app", name: "Godot", version: "4.5", isDotnet: false };
const godot45Dotnet: GodotApp = {
  path: "/Applications/Godot_mono.app",
  name: "Godot_mono",
  version: "4.5",
  isDotnet: true,
};
const godot36: GodotApp = { path: "/Applications/Godot 3.6.app", name: "Godot 3.6", version: "3.6", isDotnet: false };

function info(overrides: Partial<ProjectInfo>): ProjectInfo {
  return { name: "Space Shooter", configVersion: 5, engineVersion: "4.5", isCSharp: false, ...overrides };
}

describe("parsePlistStrings", () => {
  it("reads string values from Godot's Info.plist", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
	<key>CFBundleExecutable</key>
	<string>Godot</string>
	<key>CFBundleIdentifier</key>
	<string>org.godotengine.godot</string>
	<key>CFBundleShortVersionString</key>
	<string>4.3</string>
	<key>LSMinimumSystemVersion</key>
	<string>10.13</string>
	<key>NSHighResolutionCapable</key>
	<true/>
	<key>NSHumanReadableCopyright</key>
	<string>© 2014-present Godot Engine contributors &amp; others</string>
</dict>
</plist>`;
    const values = parsePlistStrings(xml);
    expect(values.CFBundleIdentifier).toBe("org.godotengine.godot");
    expect(values.CFBundleShortVersionString).toBe("4.3");
    expect(values.NSHumanReadableCopyright).toBe("© 2014-present Godot Engine contributors & others");
    expect(values.NSHighResolutionCapable).toBeUndefined();
  });
});

describe("versions", () => {
  it("parses version numbers", () => {
    expect(parseVersion("4.3")).toEqual([4, 3]);
    expect(parseVersion("4.3.1")).toEqual([4, 3, 1]);
    expect(parseVersion("3.x")).toEqual([3]);
    expect(parseVersion("beta")).toBeUndefined();
    expect(parseVersion(undefined)).toBeUndefined();
  });

  it("compares versions", () => {
    expect(compareVersions("4.10", "4.9")).toBeGreaterThan(0);
    expect(compareVersions("4.3", "4.3.0")).toBe(0);
    expect(compareVersions("3.6", "4.0")).toBeLessThan(0);
    expect(compareVersions(undefined, "4.0")).toBeLessThan(0);
  });

  it("matches releases on major and minor, or major for 3.x", () => {
    expect(isSameRelease("4.3", "4.3")).toBe(true);
    expect(isSameRelease("4.3.1", "4.3")).toBe(true);
    expect(isSameRelease("4.4", "4.3")).toBe(false);
    expect(isSameRelease("3.6", "3.x")).toBe(true);
    expect(isSameRelease("4.3", "3.x")).toBe(false);
    expect(isSameRelease(undefined, "4.3")).toBe(false);
  });
});

describe("chooseApp", () => {
  const all = [godot43, godot45, godot45Dotnet, godot36];

  it("returns undefined when Godot isn't installed", () => {
    expect(chooseApp([], info({}))).toBeUndefined();
  });

  it("picks the newest standard build when there is no project", () => {
    expect(chooseApp(all)).toBe(godot45);
  });

  it("picks the build that matches the project's version", () => {
    expect(chooseApp(all, info({ engineVersion: "4.3" }))).toBe(godot43);
    expect(chooseApp(all, info({ configVersion: 4, engineVersion: "3.x" }))).toBe(godot36);
  });

  it("picks the newest build when no version matches", () => {
    expect(chooseApp(all, info({ engineVersion: "4.4" }))).toBe(godot45);
    expect(chooseApp(all, info({ engineVersion: undefined }))).toBe(godot45);
  });

  it("prefers the .NET build for C# projects", () => {
    expect(chooseApp(all, info({ isCSharp: true, engineVersion: "4.3" }))).toBe(godot45Dotnet);
    expect(chooseApp(all, info({ isCSharp: true, engineVersion: "4.5" }))).toBe(godot45Dotnet);
  });

  it("falls back to a standard build for C# projects when no .NET build exists", () => {
    expect(chooseApp([godot43, godot45], info({ isCSharp: true, engineVersion: "4.3" }))).toBe(godot43);
  });

  it("uses the .NET build for other projects when it is the only one", () => {
    expect(chooseApp([godot45Dotnet], info({}))).toBe(godot45Dotnet);
  });

  it("puts apps with an unknown version last", () => {
    const unknown: GodotApp = { path: "/Applications/Godot Custom.app", name: "Godot Custom", isDotnet: false };
    expect(chooseApp([unknown, godot43], info({ engineVersion: "4.8" }))).toBe(godot43);
  });
});

describe("describeApp", () => {
  it("names the version and the .NET build", () => {
    expect(describeApp(godot45)).toBe("Godot 4.5");
    expect(describeApp(godot45Dotnet)).toBe("Godot 4.5 (.NET)");
    expect(describeApp({ path: "/Applications/Engine.app", name: "Engine", isDotnet: false })).toBe("Engine");
  });
});

describe("getOpenWarnings", () => {
  it("has no warnings when the versions match", () => {
    expect(getOpenWarnings(info({ engineVersion: "4.5" }), godot45)).toEqual([]);
    expect(getOpenWarnings(info({ configVersion: 4, engineVersion: "3.x" }), godot36)).toEqual([]);
  });

  it("warns that an older project will be updated", () => {
    expect(getOpenWarnings(info({ engineVersion: "4.3" }), godot45)).toEqual([
      "This project was last edited in Godot 4.3. Opening it in Godot 4.5 updates it to that version.",
    ]);
  });

  it("warns about a project from a newer version", () => {
    expect(getOpenWarnings(info({ engineVersion: "4.6" }), godot45)[0]).toContain("newer than Godot 4.5");
  });

  it("warns that a Godot 3 project will be converted", () => {
    expect(getOpenWarnings(info({ configVersion: 4, engineVersion: "3.x" }), godot45)[0]).toContain(
      "made with Godot 3",
    );
  });

  it("warns about a Godot 4 project in Godot 3", () => {
    expect(getOpenWarnings(info({ engineVersion: "4.3" }), godot36)[0]).toContain("newer version of Godot");
  });

  it("warns about a project without config_version", () => {
    expect(getOpenWarnings(info({ configVersion: 0, engineVersion: undefined }), godot45)[0]).toContain(
      "older version of Godot",
    );
  });

  it("warns about C# projects in a build without .NET", () => {
    expect(getOpenWarnings(info({ isCSharp: true }), godot45)).toEqual([
      "This project uses C#, but Godot 4.5 is not the .NET build, so C# scripts won't work.",
    ]);
    expect(getOpenWarnings(info({ isCSharp: true }), godot45Dotnet)).toEqual([]);
  });

  it("skips version checks when the app version is unknown", () => {
    const unknown: GodotApp = { path: "/Applications/Engine.app", name: "Engine", isDotnet: false };
    expect(getOpenWarnings(info({ engineVersion: "4.3" }), unknown)).toEqual([]);
  });
});

describe("getRunProblem", () => {
  it("allows any Godot of the same major version", () => {
    expect(getRunProblem(info({ engineVersion: "4.3" }), godot45)).toBeUndefined();
    expect(getRunProblem(info({ configVersion: 4, engineVersion: "3.x" }), godot36)).toBeUndefined();
  });

  it("refuses a Godot 3 project in Godot 4", () => {
    expect(getRunProblem(info({ configVersion: 4, engineVersion: "3.x" }), godot45)).toBe(
      "This project was made with Godot 3, so Godot 4.5 can't run it. Open it in the editor to convert it first.",
    );
  });

  it("refuses a Godot 4 project in Godot 3", () => {
    expect(getRunProblem(info({ engineVersion: "4.3" }), godot36)).toBe(
      "This project was made with a newer version of Godot, so Godot 3.6 can't run it.",
    );
  });

  it("does not guess when the app version is unknown", () => {
    const unknown: GodotApp = { path: "/Applications/Engine.app", name: "Engine", isDotnet: false };
    expect(getRunProblem(info({ configVersion: 4 }), unknown)).toBeUndefined();
  });
});
