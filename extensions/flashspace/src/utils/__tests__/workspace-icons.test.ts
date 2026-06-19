import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

vi.mock("@raycast/api", () => ({
  Icon: {
    Window: "window-icon",
    Power: "power-icon",
    Globe: "globe-icon",
    Message: "message-icon",
    Book: "book-icon",
    FilmStrip: "film-icon",
    GameController: "game-icon",
    Headphones: "headphones-icon",
    PersonLines: "person-lines-icon",
    Terminal: "terminal-icon",
    QuestionMarkCircle: "question-icon",
  },
}));

import {
  extractWorkspaceIconConfig,
  loadWorkspaceIcons,
  loadWorkspaceIconsAsync,
  resolveWorkspaceIcon,
} from "../workspace-icons";

describe("workspace icon helpers", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it("BUG 8: should extract workspace icon names for the active profile", () => {
    const config = {
      profiles: [
        {
          name: "Personal",
          workspaces: [{ name: "Agents", symbolIconName: "poweroutlet.type.h" }],
        },
        {
          name: "Work",
          workspaces: [{ name: "Terminal", symbolIconName: "apple.terminal" }],
        },
      ],
    };

    expect(extractWorkspaceIconConfig(config, "Work")).toEqual([
      { name: "Terminal", symbolIconName: "apple.terminal" },
    ]);
  });

  it("should map known FlashSpace symbol names to Raycast icons", () => {
    expect(resolveWorkspaceIcon("globe")).toBe("globe-icon");
    expect(resolveWorkspaceIcon("message")).toBe("message-icon");
    expect(resolveWorkspaceIcon("text.book.closed")).toBe("book-icon");
    expect(resolveWorkspaceIcon("movieclapper")).toBe("film-icon");
    expect(resolveWorkspaceIcon("gamecontroller")).toBe("game-icon");
    expect(resolveWorkspaceIcon("apple.terminal")).toBe("terminal-icon");
    expect(resolveWorkspaceIcon("questionmark.app")).toBe("question-icon");
    expect(resolveWorkspaceIcon("poweroutlet.type.k")).toBe("power-icon");
  });

  it("should fall back to the window icon for unknown or missing workspace symbols", () => {
    expect(resolveWorkspaceIcon()).toBe("window-icon");
    expect(resolveWorkspaceIcon("unknown.symbol")).toBe("window-icon");
  });

  it("should load workspace icons from a TOML config file", () => {
    const dir = mkdtempSync(join(tmpdir(), "flashspace-icons-toml-"));
    tempDirs.push(dir);

    writeFileSync(
      join(dir, "profiles.toml"),
      [
        "[[profiles]]",
        "name = 'Work'",
        "",
        "[[profiles.workspaces]]",
        "name = 'Browser'",
        "symbolIconName = 'globe'",
        "",
        "[[profiles]]",
        "name = 'Personal'",
        "",
        "[[profiles.workspaces]]",
        "name = 'Chat'",
        "symbolIconName = 'message'",
      ].join("\n"),
    );

    expect(loadWorkspaceIcons("Work", dir)).toEqual({ Browser: "globe-icon" });
  });

  it("should load workspace icons from a JSON config file", () => {
    const dir = mkdtempSync(join(tmpdir(), "flashspace-icons-json-"));
    tempDirs.push(dir);

    writeFileSync(
      join(dir, "profiles.json"),
      JSON.stringify({
        profiles: [
          {
            name: "Work",
            workspaces: [{ name: "Terminal", symbolIconName: "apple.terminal" }],
          },
        ],
      }),
    );

    expect(loadWorkspaceIcons("Work", dir)).toEqual({ Terminal: "terminal-icon" });
  });

  it("should load workspace icons from a YAML config file", () => {
    const dir = mkdtempSync(join(tmpdir(), "flashspace-icons-yaml-"));
    tempDirs.push(dir);

    writeFileSync(
      join(dir, "profiles.yaml"),
      [
        "profiles:",
        "  - name: Work",
        "    workspaces:",
        "      - name: Music",
        "        symbolIconName: headphones",
      ].join("\n"),
    );

    expect(loadWorkspaceIcons("Work", dir)).toEqual({ Music: "headphones-icon" });
  });

  it("should return an empty map when no supported config file exists", () => {
    const dir = mkdtempSync(join(tmpdir(), "flashspace-icons-empty-"));
    tempDirs.push(dir);

    expect(loadWorkspaceIcons("Work", dir)).toEqual({});
  });
});

describe("loadWorkspaceIconsAsync", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  it("should load icons asynchronously from a TOML config file", async () => {
    const dir = mkdtempSync(join(tmpdir(), "flashspace-async-toml-"));
    tempDirs.push(dir);

    writeFileSync(
      join(dir, "profiles.toml"),
      [
        "[[profiles]]",
        "name = 'Work'",
        "",
        "[[profiles.workspaces]]",
        "name = 'Browser'",
        "symbolIconName = 'globe'",
      ].join("\n"),
    );

    await expect(loadWorkspaceIconsAsync("Work", dir)).resolves.toEqual({ Browser: "globe-icon" });
  });

  it("should load icons asynchronously from a JSON config file", async () => {
    const dir = mkdtempSync(join(tmpdir(), "flashspace-async-json-"));
    tempDirs.push(dir);

    writeFileSync(
      join(dir, "profiles.json"),
      JSON.stringify({
        profiles: [{ name: "Work", workspaces: [{ name: "Terminal", symbolIconName: "apple.terminal" }] }],
      }),
    );

    await expect(loadWorkspaceIconsAsync("Work", dir)).resolves.toEqual({ Terminal: "terminal-icon" });
  });

  it("should return an empty map when no supported config file exists", async () => {
    const dir = mkdtempSync(join(tmpdir(), "flashspace-async-empty-"));
    tempDirs.push(dir);

    await expect(loadWorkspaceIconsAsync("Work", dir)).resolves.toEqual({});
  });

  it("should return an empty map and warn on malformed config", async () => {
    const dir = mkdtempSync(join(tmpdir(), "flashspace-async-bad-"));
    tempDirs.push(dir);

    writeFileSync(join(dir, "profiles.json"), "{ this is not valid json }");

    await expect(loadWorkspaceIconsAsync("Work", dir)).resolves.toEqual({});
  });

  it("should skip profiles that do not match the active profile name", async () => {
    const dir = mkdtempSync(join(tmpdir(), "flashspace-async-mismatch-"));
    tempDirs.push(dir);

    writeFileSync(
      join(dir, "profiles.json"),
      JSON.stringify({
        profiles: [{ name: "Personal", workspaces: [{ name: "Music", symbolIconName: "headphones" }] }],
      }),
    );

    await expect(loadWorkspaceIconsAsync("Work", dir)).resolves.toEqual({});
  });
});
