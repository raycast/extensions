import { getPreferenceValues } from "@raycast/api";

import {
  DEFAULT_LIBRARY_PATH,
  expandPath,
  loadLibrary,
  removeCommand,
  upsertCommand,
} from "./library";
import type {
  Library,
  SavedCommand,
  SpellbookPreferences,
  TerminalApp,
} from "./types";

export function libraryPath(): string {
  const preferences = getPreferenceValues<SpellbookPreferences>();
  const configured = preferences.libraryPath?.trim();
  return expandPath(
    configured === undefined || configured === ""
      ? DEFAULT_LIBRARY_PATH
      : configured,
  );
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
  return getPreferenceValues<SpellbookPreferences>().terminalApp ?? "Terminal";
}
