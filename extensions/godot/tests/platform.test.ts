import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

type Callback = (error: Error | null, result?: { stdout: string; stderr: string }) => void;

const calls: { file: string; args: string[] }[] = [];
let respond: (file: string, args: string[]) => { error?: Error; stdout?: string } = () => ({});

vi.mock("node:child_process", () => ({
  execFile: (file: string, args: string[], ...rest: unknown[]) => {
    calls.push({ file, args });
    const callback = rest[rest.length - 1] as Callback;
    const { error, stdout = "" } = respond(file, args);
    callback(error ?? null, { stdout, stderr: "" });
  },
}));

const { findGodotApps, getProjectListPath, launchGodot } = await import("../src/lib/platform");

let root: string;

async function makeApp(appPath: string, bundleId: string, version: string, dotnet = false) {
  await mkdir(path.join(appPath, "Contents"), { recursive: true });
  await writeFile(
    path.join(appPath, "Contents", "Info.plist"),
    `<plist><dict><key>CFBundleIdentifier</key><string>${bundleId}</string><key>CFBundleShortVersionString</key><string>${version}</string></dict></plist>`,
  );
  if (dotnet) await mkdir(path.join(appPath, "Contents", "Resources", "GodotSharp"), { recursive: true });
}

beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), "godot-platform-test-"));
  await makeApp(path.join(root, "Applications", "Godot.app"), "org.godotengine.godot", "4.5");
  await makeApp(path.join(root, "Applications", "Godot_mono.app"), "org.godotengine.godot", "4.5", true);
  await makeApp(path.join(root, "Applications", "Godot Engines", "Godot 4.3.app"), "org.godotengine.godot", "4.3");
  await makeApp(path.join(root, "Applications", "Godot Notes.app"), "com.example.notes", "1.0");
  await makeApp(path.join(root, "Applications", "Other.app"), "org.godotengine.godot", "4.2");
  await makeApp(path.join(root, "Elsewhere", "Renamed Engine.app"), "org.godotengine.godot", "4.4");
  await mkdir(path.join(root, "Links"), { recursive: true });
  await symlink(path.join(root, "Applications", "Godot.app"), path.join(root, "Links", "Godot Link.app"));
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

beforeEach(() => {
  calls.length = 0;
  respond = () => ({});
});

describe("getProjectListPath", () => {
  it("points to Godot's data folder on macOS", () => {
    expect(getProjectListPath("/Users/ada")).toBe("/Users/ada/Library/Application Support/Godot/projects.cfg");
  });
});

describe("launchGodot", () => {
  it("starts a new instance with open and passes the arguments unchanged", async () => {
    await launchGodot("/Applications/Godot.app", ["--path", "/Users/ada/My Games/-space shooter", "--editor"]);
    expect(calls).toEqual([
      {
        file: "/usr/bin/open",
        args: ["-n", "-a", "/Applications/Godot.app", "--args", "--path", "/Users/ada/My Games/-space shooter", "--editor"],
      },
    ]);
  });

  it("reports what open printed when it fails", async () => {
    respond = () => ({ error: Object.assign(new Error("Command failed"), { stderr: "Unable to find application\n" }) });
    await expect(launchGodot("/Applications/Gone.app", ["--project-manager"])).rejects.toThrow(
      "Unable to find application",
    );
  });
});

describe("findGodotApps", () => {
  it("finds Godot apps by name and with Spotlight, without duplicates or Trash copies", async () => {
    respond = (file) =>
      file === "/usr/bin/mdfind"
        ? {
            stdout: [
              path.join(root, "Elsewhere", "Renamed Engine.app"),
              path.join(root, "Applications", "Godot.app"),
              path.join(root, "Links", "Godot Link.app"),
              "/Users/ada/.Trash/Godot.app",
              "",
            ].join("\n"),
          }
        : {};

    const apps = await findGodotApps([path.join(root, "Applications"), path.join(root, "Missing")]);
    const byName = Object.fromEntries(apps.map((app) => [app.name, app]));

    expect(Object.keys(byName).sort()).toEqual(["Godot", "Godot 4.3", "Godot_mono", "Renamed Engine"]);
    expect(byName["Godot_mono"]).toMatchObject({ version: "4.5", isDotnet: true });
    expect(byName["Godot"]).toMatchObject({ version: "4.5", isDotnet: false });
    expect(calls.find((call) => call.file === "/usr/bin/mdfind")?.args).toEqual([
      "kMDItemCFBundleIdentifier == 'org.godotengine.godot'",
    ]);
  });

  it("still finds apps by name when Spotlight fails", async () => {
    respond = (file) => (file === "/usr/bin/mdfind" ? { error: new Error("mdfind failed") } : {});
    const apps = await findGodotApps([path.join(root, "Applications")]);
    expect(apps.map((app) => app.name).sort()).toEqual(["Godot", "Godot 4.3", "Godot_mono"]);
  });
});
