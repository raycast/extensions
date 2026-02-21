import { spawnSync } from "node:child_process";
import { writeVeljaBrowserPreference } from "./velja";

function assertShortcutsAvailable(): void {
  const probe = spawnSync("shortcuts", ["--help"], { encoding: "utf8" });
  if (probe.status !== 0) {
    throw new Error("The macOS `shortcuts` CLI is not available on this machine.");
  }
}

export function runShortcut(shortcutName: string, input?: string): string {
  assertShortcutsAvailable();

  const result = spawnSync("shortcuts", ["run", shortcutName], {
    encoding: "utf8",
    input,
  });

  if (result.status !== 0) {
    const error = result.stderr.trim() || result.stdout.trim() || `Shortcut "${shortcutName}" failed`;
    throw new Error(error);
  }

  return result.stdout.trim();
}

export function listShortcuts(): string[] {
  assertShortcutsAvailable();

  const result = spawnSync("shortcuts", ["list"], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    const error = result.stderr.trim() || "Failed to list shortcuts";
    throw new Error(error);
  }

  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

const SHORTCUT_NAMES = {
  setDefaultBrowser: "Set Default Browser",
  setAlternativeBrowser: "Set Alternative Browser",
};

export function setDefaultBrowserViaShortcut(browserIdentifier: string): void {
  try {
    runShortcut(SHORTCUT_NAMES.setDefaultBrowser, browserIdentifier);
  } catch {
    writeVeljaBrowserPreference("defaultBrowser", browserIdentifier);
  }
}

export function setAlternativeBrowserViaShortcut(browserIdentifier: string): void {
  try {
    runShortcut(SHORTCUT_NAMES.setAlternativeBrowser, browserIdentifier);
  } catch {
    writeVeljaBrowserPreference("alternativeBrowser", browserIdentifier);
  }
}
