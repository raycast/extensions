import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { emptyLibrary, loadLibrary, removeCommand, saveLibrary, upsertCommand } from "../src/lib/library";
import type { SavedCommand } from "../src/lib/types";

function makeCommand(overrides: Partial<SavedCommand> = {}): SavedCommand {
  return {
    id: "id-1",
    name: "List files",
    template: "ls -la {{dir=.}}",
    keywords: [],
    runMode: "inline",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("library", () => {
  let dir: string;
  let path: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "spellbook-test-"));
    path = join(dir, "nested", "commands.json");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("returns an empty library when the file does not exist", () => {
    expect(loadLibrary(path)).toEqual(emptyLibrary());
  });

  it("round-trips a library through save and load", () => {
    const library = { version: 1 as const, commands: [makeCommand()] };
    saveLibrary(path, library);
    expect(loadLibrary(path)).toEqual(library);
  });

  it("writes human-readable JSON with a trailing newline", () => {
    saveLibrary(path, emptyLibrary());
    const raw = readFileSync(path, "utf8");
    expect(raw.endsWith("\n")).toBe(true);
    expect(raw).toContain("\n  \"version\": 1");
  });

  it("upserts by id", () => {
    upsertCommand(path, makeCommand());
    upsertCommand(path, makeCommand({ name: "Renamed" }));
    upsertCommand(path, makeCommand({ id: "id-2", name: "Second" }));
    const library = loadLibrary(path);
    expect(library.commands).toHaveLength(2);
    expect(library.commands[0].name).toBe("Renamed");
  });

  it("removes by id", () => {
    upsertCommand(path, makeCommand());
    upsertCommand(path, makeCommand({ id: "id-2" }));
    removeCommand(path, "id-1");
    expect(loadLibrary(path).commands.map((command) => command.id)).toEqual(["id-2"]);
  });

  it("throws on structurally invalid libraries", () => {
    saveLibrary(path, emptyLibrary());
    writeFileSync(path, JSON.stringify({ version: 2, commands: [] }), "utf8");
    expect(() => loadLibrary(path)).toThrow(/Invalid library file/);
  });

  it("rejects entries with a non-string cwd", () => {
    saveLibrary(path, emptyLibrary());
    const bad: unknown = { ...makeCommand(), cwd: 5 };
    writeFileSync(path, JSON.stringify({ version: 1, commands: [bad] }), "utf8");
    expect(() => loadLibrary(path)).toThrow(/Invalid library file/);
  });

  it("rejects entries missing timestamps", () => {
    saveLibrary(path, emptyLibrary());
    const { createdAt: _createdAt, ...rest } = makeCommand();
    writeFileSync(path, JSON.stringify({ version: 1, commands: [rest] }), "utf8");
    expect(() => loadLibrary(path)).toThrow(/Invalid library file/);
  });

  it("throws on malformed JSON", () => {
    saveLibrary(path, emptyLibrary());
    writeFileSync(path, "{ not json", "utf8");
    expect(() => loadLibrary(path)).toThrow();
  });
});
