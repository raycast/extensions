import { getPreferenceValues } from "@raycast/api";

import {
  DEFAULT_LIBRARY_PATH,
  expandPath,
  loadLibrary,
  removeCommand,
  upsertCommand,
} from "./library";
import type { Library, SavedCommand, TerminalApp } from "./types";

export function libraryPath(): string {
  const configured = getPreferenceValues<Preferences>().libraryPath.trim();
  return expandPath(configured === "" ? DEFAULT_LIBRARY_PATH : configured);
}

export function readLibrary(): Library {
  return loadLibrary(libraryPath());
}

export function writeCommand(command: SavedCommand): Library {
  return upsertCommand(libraryPath(), command);
}

export function deleteCommand(id: string): Library {
  return removeCommand(libraryPath(), id);
}

export function preferredTerminal(): TerminalApp {
  return getPreferenceValues<Preferences>().terminalApp;
}
