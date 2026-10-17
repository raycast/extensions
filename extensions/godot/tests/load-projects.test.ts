import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { describeReadError, loadProjects } from "../src/lib/load-projects";
import { readApp } from "../src/lib/platform";
import { uidToId } from "../src/lib/uid-cache";

let root: string;

async function write(filePath: string, content: string | Buffer) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
}

function uidCache(uid: string, resourcePath: string): Buffer {
  const text = Buffer.from(resourcePath, "utf8");
  const buffer = Buffer.alloc(16 + text.length);
  buffer.writeUInt32LE(1, 0);
  buffer.writeBigUInt64LE(uidToId(uid)!, 4);
  buffer.writeUInt32LE(text.length, 12);
  text.copy(buffer, 16);
  return buffer;
}

beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), "godot-projects-test-"));

  const shooter = path.join(root, "space-shooter");
  await write(
    path.join(shooter, "project.godot"),
    'config_version=5\n\n[application]\n\nconfig/name="Space Shooter"\nrun/main_scene="res://main.tscn"\nconfig/features=PackedStringArray("4.3", "C#", "Forward Plus")\nconfig/icon="res://icon.svg"\n',
  );
  await write(path.join(shooter, "icon.svg"), "<svg xmlns='http://www.w3.org/2000/svg'/>");
  await mkdir(path.join(shooter, ".godot", "imported"), { recursive: true });
  await utimes(path.join(shooter, "project.godot"), new Date("2026-03-01"), new Date("2026-03-01"));

  const garden = path.join(root, "puzzle-garden");
  await write(
    path.join(garden, "project.godot"),
    'config_version=5\n\n[application]\n\nconfig/name="Puzzle Garden"\nconfig/features=PackedStringArray("4.4", "GL Compatibility")\nconfig/icon="uid://cl4ymsdo1rdxx"\n',
  );
  await write(path.join(garden, "art", "logo.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  await write(path.join(garden, ".godot", "uid_cache.bin"), uidCache("uid://cl4ymsdo1rdxx", "res://art/logo.png"));

  const noIcon = path.join(root, "no-icon");
  await write(path.join(noIcon, "project.godot"), 'config_version=5\n[application]\nconfig/icon="res://missing.png"\n');

  await mkdir(path.join(root, "empty-folder"));
  await write(path.join(root, "broken", "project.godot"), '[application]\nconfig/name="Broken\n');

  await write(
    path.join(root, "projects.cfg"),
    [
      `[${shooter}]`,
      "",
      "favorite=true",
      "",
      `[${garden}]`,
      "",
      "favorite=false",
      "",
      `[${noIcon}]`,
      "",
      "favorite=false",
      "",
      `[${path.join(root, "deleted")}]`,
      "",
      "favorite=false",
      "",
      `[${path.join(root, "empty-folder")}]`,
      "",
      "favorite=false",
      "",
      `[${path.join(root, "broken")}]`,
      "",
      "favorite=false",
      "",
    ].join("\n"),
  );

  const app = path.join(root, "Apps", "Godot_mono.app");
  await write(
    path.join(app, "Contents", "Info.plist"),
    "<plist><dict><key>CFBundleIdentifier</key><string>org.godotengine.godot</string><key>CFBundleShortVersionString</key><string>4.5</string></dict></plist>",
  );
  await mkdir(path.join(app, "Contents", "Resources", "GodotSharp"), { recursive: true });
  await mkdir(path.join(root, "Apps", "NoPlist.app", "Contents"), { recursive: true });
  await write(
    path.join(root, "Apps", "Other.app", "Contents", "Info.plist"),
    "<plist><dict><key>CFBundleIdentifier</key><string>com.example.other</string></dict></plist>",
  );
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("loadProjects", () => {
  it("reports a missing project list without failing", async () => {
    expect(await loadProjects(path.join(root, "nope", "projects.cfg"))).toEqual({ listFound: false, projects: [] });
  });

  it("fails with a clear message when the project list is damaged", async () => {
    await write(path.join(root, "bad.cfg"), '[/Users/ada/Projects/space-shooter]\nfavorite="oops\n');
    await expect(loadProjects(path.join(root, "bad.cfg"))).rejects.toThrow(
      /The Godot project list \(.*bad\.cfg\) is damaged: Unterminated string on line 2/,
    );
  });

  it("loads every listed project", async () => {
    const { listFound, projects } = await loadProjects(path.join(root, "projects.cfg"));
    expect(listFound).toBe(true);
    const byFolder = Object.fromEntries(projects.map((project) => [path.basename(project.path), project]));

    expect(byFolder["space-shooter"]).toMatchObject({
      name: "Space Shooter",
      favorite: true,
      status: "ok",
      engineVersion: "4.3",
      renderer: "Forward Plus",
      isCSharp: true,
      iconPath: path.join(root, "space-shooter", "icon.svg"),
      mainScene: "res://main.tscn",
      hasImportedAssets: true,
      lastModified: new Date("2026-03-01").getTime(),
    });

    expect(byFolder["puzzle-garden"]).toMatchObject({
      name: "Puzzle Garden",
      status: "ok",
      engineVersion: "4.4",
      isCSharp: false,
      iconPath: path.join(root, "puzzle-garden", "art", "logo.png"),
      hasImportedAssets: false,
    });
    expect(byFolder["puzzle-garden"].mainScene).toBeUndefined();

    expect(byFolder["no-icon"]).toMatchObject({ name: "no-icon", status: "ok" });
    expect(byFolder["no-icon"].iconPath).toBeUndefined();

    expect(byFolder["deleted"]).toMatchObject({
      name: "deleted",
      status: "missing",
      folderExists: false,
      problem: "This folder no longer exists.",
    });
    expect(byFolder["deleted"].lastModified).toBeUndefined();

    expect(byFolder["empty-folder"]).toMatchObject({
      status: "missing",
      folderExists: true,
      problem: "This folder has no project.godot file.",
    });

    expect(byFolder["broken"]).toMatchObject({ status: "unreadable", folderExists: true });
    expect(byFolder["broken"].problem).toContain("project.godot is damaged: Unterminated string on line 2");
  });
});

describe("describeReadError", () => {
  it("explains the macOS privacy check", () => {
    const error = Object.assign(new Error("EPERM: operation not permitted, open 'project.godot'"), { code: "EPERM" });
    expect(describeReadError(error)).toContain("System Settings > Privacy & Security > Files and Folders");
  });

  it("keeps other errors as they are", () => {
    const error = Object.assign(new Error("EACCES: permission denied"), { code: "EACCES" });
    expect(describeReadError(error)).toBe("EACCES: permission denied");
  });
});

describe("readApp", () => {
  it("reads the version and finds the .NET build", async () => {
    expect(await readApp(path.join(root, "Apps", "Godot_mono.app"), true)).toEqual({
      path: path.join(root, "Apps", "Godot_mono.app"),
      name: "Godot_mono",
      version: "4.5",
      isDotnet: true,
    });
  });

  it("ignores apps that aren't Godot when asked to", async () => {
    expect(await readApp(path.join(root, "Apps", "Other.app"), true)).toBeUndefined();
    expect(await readApp(path.join(root, "Apps", "NoPlist.app"), true)).toBeUndefined();
  });

  it("keeps an app chosen in the preferences even without an Info.plist", async () => {
    expect(await readApp(path.join(root, "Apps", "NoPlist.app"), false)).toEqual({
      path: path.join(root, "Apps", "NoPlist.app"),
      name: "NoPlist",
      version: undefined,
      isDotnet: false,
    });
  });

  it("returns undefined for an app that doesn't exist", async () => {
    expect(await readApp(path.join(root, "Apps", "Missing.app"), false)).toBeUndefined();
  });
});
