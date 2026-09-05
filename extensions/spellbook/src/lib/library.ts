import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";

import type { Library, SavedCommand } from "./types";

export const DEFAULT_LIBRARY_PATH = "~/.config/spellbook/commands.json";

export function expandPath(path: string): string {
  if (path === "~") {
    return homedir();
  }
  if (path.startsWith("~/")) {
    return join(homedir(), path.slice(2));
  }
  return isAbsolute(path) ? path : join(homedir(), path);
}

export function emptyLibrary(): Library {
  return { version: 1, commands: [] };
}

function isSavedCommand(value: unknown): value is SavedCommand {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const command = value as Record<string, unknown>;
  return (
    typeof command.id === "string" &&
    typeof command.name === "string" &&
    typeof command.template === "string" &&
    Array.isArray(command.keywords) &&
    command.keywords.every((keyword) => typeof keyword === "string") &&
    (command.runMode === "inline" || command.runMode === "terminal") &&
    (command.cwd === undefined || typeof command.cwd === "string") &&
    typeof command.createdAt === "string" &&
    typeof command.updatedAt === "string"
  );
}

function isLibrary(value: unknown): value is Library {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const library = value as Record<string, unknown>;
  return (
    library.version === 1 &&
    Array.isArray(library.commands) &&
    library.commands.every(isSavedCommand)
  );
}

export function loadLibrary(path: string): Library {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return emptyLibrary();
    }
    throw error;
  }
  const parsed: unknown = JSON.parse(raw);
  if (!isLibrary(parsed)) {
    throw new Error(`Invalid library file at ${path}`);
  }
  return parsed;
}

export function saveLibrary(path: string, library: Library): void {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.tmp-${process.pid}`;
  writeFileSync(temp, `${JSON.stringify(library, null, 2)}\n`, "utf8");
  renameSync(temp, path);
}

export function upsertCommand(path: string, command: SavedCommand): Library {
  const library = loadLibrary(path);
  const index = library.commands.findIndex(
    (existing) => existing.id === command.id,
  );
  if (index >= 0) {
    library.commands[index] = command;
  } else {
    library.commands.push(command);
  }
  saveLibrary(path, library);
  return library;
}

export function removeCommand(path: string, id: string): Library {
  const library = loadLibrary(path);
  library.commands = library.commands.filter((existing) => existing.id !== id);
  saveLibrary(path, library);
  return library;
}
