import { Cache, getPreferenceValues } from "@raycast/api";
import { execFileSync } from "child_process";
import { existsSync, statSync } from "fs";
import { homedir } from "os";
import { basename } from "path";

const HOME = homedir();
const PLIST_PATH = `${HOME}/Library/Preferences/com.lowtechguys.Cling.plist`;
const persistentCache = new Cache({ namespace: "cling-app-resolver" });
const FALLBACK_CLI = "/Applications/Cling.app/Contents/SharedSupport/ClingCLI";

let cachedCLI: string | null = null;

export function resolveClingCLI(): string {
  if (cachedCLI) return cachedCLI;
  try {
    const stdout = execFileSync("/bin/ps", ["-Axo", "comm="], { encoding: "utf-8" });
    const line = stdout.split("\n").find((l) => l.includes("/Cling.app/Contents/MacOS/"));
    if (line) {
      const marker = "/Cling.app";
      const end = line.indexOf(marker) + marker.length;
      const bundle = line.slice(0, end);
      cachedCLI = `${bundle}/Contents/SharedSupport/ClingCLI`;
      return cachedCLI;
    }
  } catch {
    // fall through
  }
  cachedCLI = FALLBACK_CLI;
  return cachedCLI;
}

export function clingInstalled(): boolean {
  return existsSync(resolveClingCLI());
}

const KNOWN_DEFAULT_KEYS = ["terminalApp", "editorApp", "shelfApp", "copyPathsWithTilde"] as const;

type DefaultsSnapshot = {
  plistMtimeMs: number;
  values: Record<string, string | undefined>;
};

function plistMtimeMs(): number {
  try {
    return statSync(PLIST_PATH).mtimeMs;
  } catch {
    return 0;
  }
}

let defaultsSnapshot: DefaultsSnapshot | null = null;

function loadDefaults(): DefaultsSnapshot {
  if (defaultsSnapshot) return defaultsSnapshot;
  const mtime = plistMtimeMs();

  const raw = persistentCache.get("defaults");
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DefaultsSnapshot;
      if (parsed.plistMtimeMs === mtime) {
        defaultsSnapshot = parsed;
        return parsed;
      }
    } catch {
      // fall through
    }
  }

  const values: Record<string, string | undefined> = {};
  for (const key of KNOWN_DEFAULT_KEYS) {
    try {
      values[key] = execFileSync("defaults", ["read", "com.lowtechguys.Cling", key], {
        encoding: "utf-8",
      }).trim();
    } catch {
      values[key] = undefined;
    }
  }

  defaultsSnapshot = { plistMtimeMs: mtime, values };
  persistentCache.set("defaults", JSON.stringify(defaultsSnapshot));
  return defaultsSnapshot;
}

export function getClingDefault(key: string): string | undefined {
  return loadDefaults().values[key];
}

const SHELF_BUNDLE_IDS = [
  "at.EternalStorms.Yoink",
  "at.EternalStorms.Yoink-setapp",
  "me.damir.dropover-mac",
  "com.hachipoo.Dockside",
];

let detectedShelfApp: { value: string | undefined } | null = null;

function detectShelfApp(): string | undefined {
  if (detectedShelfApp) return detectedShelfApp.value;

  const raw = persistentCache.get("shelf");
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { path: string | undefined };
      if (parsed.path && existsSync(parsed.path)) {
        detectedShelfApp = { value: parsed.path };
        return parsed.path;
      }
    } catch {
      // fall through
    }
  }

  let value: string | undefined;
  for (const bundleID of SHELF_BUNDLE_IDS) {
    try {
      const result = execFileSync("mdfind", [`kMDItemCFBundleIdentifier == '${bundleID}'`], {
        encoding: "utf-8",
      }).trim();
      if (result) {
        value = result.split("\n")[0];
        break;
      }
    } catch {
      continue;
    }
  }

  detectedShelfApp = { value };
  if (value) {
    persistentCache.set("shelf", JSON.stringify({ path: value }));
  } else if (raw) {
    persistentCache.remove("shelf");
  }
  return value;
}

const VSCODE_PATHS = [
  "/Applications/Visual Studio Code.app",
  "/Applications/Visual Studio Code - Insiders.app",
  `${HOME}/Applications/Visual Studio Code.app`,
  `${HOME}/Applications/Visual Studio Code - Insiders.app`,
];

const TERMINAL_FALLBACKS = ["/System/Applications/Utilities/Terminal.app", "/Applications/Utilities/Terminal.app"];

const TEXT_EDIT_FALLBACKS = ["/System/Applications/TextEdit.app", "/Applications/TextEdit.app"];

export type AppRef = { name: string; path: string | undefined };

function fromPath(path: string): AppRef {
  return { name: basename(path, ".app"), path };
}

function fromValidPath(path: string | undefined): AppRef | undefined {
  if (!path || !existsSync(path)) return undefined;
  return fromPath(path);
}

function findApp(paths: string[]): AppRef | undefined {
  const path = paths.find((p) => existsSync(p));
  return path ? fromPath(path) : undefined;
}

let cachedEditor: { value: AppRef } | null = null;
let cachedTerminal: { value: AppRef } | null = null;
let cachedShelf: { value: AppRef | undefined } | null = null;

export function getTerminalApp(): AppRef {
  if (cachedTerminal) return cachedTerminal.value;
  const prefs = getPreferenceValues<Preferences>();

  const value: AppRef = fromValidPath(prefs.terminalApp?.path) ??
    fromValidPath(getClingDefault("terminalApp")) ??
    findApp(TERMINAL_FALLBACKS) ?? { name: "Terminal", path: undefined };

  cachedTerminal = { value };
  return value;
}

export function getEditorApp(): AppRef {
  if (cachedEditor) return cachedEditor.value;
  const prefs = getPreferenceValues<Preferences>();

  const value: AppRef = fromValidPath(prefs.editorApp?.path) ??
    fromValidPath(getClingDefault("editorApp")) ??
    findApp(VSCODE_PATHS) ??
    findApp(TEXT_EDIT_FALLBACKS) ?? { name: "TextEdit", path: undefined };

  cachedEditor = { value };
  return value;
}

export function getShelfApp(): AppRef | undefined {
  if (cachedShelf) return cachedShelf.value;
  const prefs = getPreferenceValues<Preferences>();

  let value: AppRef | undefined = fromValidPath(prefs.shelfApp?.path) ?? fromValidPath(getClingDefault("shelfApp"));
  if (!value) {
    const detected = detectShelfApp();
    value = detected ? fromPath(detected) : undefined;
  }

  cachedShelf = { value };
  return value;
}

export const NOT_INSTALLED_MARKDOWN = `# Cling is not installed

This Raycast extension is a frontend for the [Cling](https://lowtechguys.com/cling) app, which provides the indexing and search backend.

## Install

1. Download Cling from [lowtechguys.com/cling](https://lowtechguys.com/cling) (or via Homebrew: \`brew install --cask thelowtechguys-cling\`).
2. Move \`Cling.app\` to \`/Applications\` or \`~/Applications\`.
3. Launch it once and let it finish the initial index.
4. Install its CLI from Cling's settings (Search > Command Line Tool).
4. Re-run this command.
`;
