import { LocalStorage } from "@raycast/api";
import type { AppPathMapping, AppPathStore, EditorTarget, ProjectType } from "../types";
import type { CustomTypeRule } from "./projectTypeDetector";

/**
 * Persisted, user-editable mapping of `projectType -> { vscode, webstorm, iterm }`
 * app paths. This is intentionally kept separate from the static extension
 * `preferences` (package.json) because Raycast preferences are a fixed schema
 * defined at build time — they can't grow new keys at runtime. Storing the
 * mapping in LocalStorage lets users register brand-new project types (e.g.
 * "deno", "unity") from the "Manage App Paths" command without ever touching
 * source code or re-installing the extension.
 */
const STORAGE_KEY = "dev-project-launcher.app-path-store.v1";

const ITERM = "/Applications/iTerm.app";
/**
 * Apple's own `/usr/bin/xed`, which opens the .xcodeproj/.xcworkspace/Package.swift
 * inside a folder with whichever Xcode is currently selected — no hardcoded app
 * path that breaks on versioned installs like `Xcode-26.6.0.app`.
 */
const XCODE = "xed";

/**
 * Seed values shipped with the extension so first-run users see sensible
 * defaults. `preferred` is the app the primary Open action uses — the natural
 * tool for that project type, which is why an Xcode project opens in Xcode
 * rather than in VS Code. Types with no single obvious tool default to VS Code.
 */
export const DEFAULT_APP_PATH_STORE: AppPathStore = {
  xcode: { preferred: XCODE, vscode: "code", webstorm: "webstorm", iterm: ITERM },
  "swift-package": { preferred: XCODE, vscode: "code", webstorm: "webstorm", iterm: ITERM },
  "android-gradle": {
    preferred: "/Applications/Android Studio.app",
    vscode: "code",
    webstorm: "studio",
    iterm: ITERM,
  },
  "kotlin-gradle": { preferred: "idea", vscode: "code", webstorm: "webstorm", iterm: ITERM },
  node: { preferred: "code", vscode: "code", webstorm: "webstorm", iterm: ITERM },
  typescript: { preferred: "code", vscode: "code", webstorm: "webstorm", iterm: ITERM },
  python: { preferred: "code", vscode: "code", webstorm: "pycharm", iterm: ITERM },
  rust: { preferred: "code", vscode: "code", webstorm: "clion", iterm: ITERM },
  go: { preferred: "code", vscode: "code", webstorm: "goland", iterm: ITERM },
  "java-maven": { preferred: "idea", vscode: "code", webstorm: "idea", iterm: ITERM },
  flutter: { preferred: "code", vscode: "code", webstorm: "webstorm", iterm: ITERM },
  ruby: { preferred: "code", vscode: "code", webstorm: "rubymine", iterm: ITERM },
  generic: { preferred: "code", vscode: "code", webstorm: "webstorm", iterm: ITERM },
};

/** Loads the full persisted store, seeding it with defaults on first run. */
export async function loadAppPathStore(): Promise<AppPathStore> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) {
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_APP_PATH_STORE));
    return { ...DEFAULT_APP_PATH_STORE };
  }
  try {
    const parsed = JSON.parse(raw) as AppPathStore;
    // Merge per type, not per store, so a mapping saved by an older version
    // keeps the user's edits while gaining fields added since (e.g. `preferred`).
    const merged: AppPathStore = { ...parsed };
    for (const [type, defaults] of Object.entries(DEFAULT_APP_PATH_STORE)) {
      merged[type] = { ...defaults, ...parsed[type] };
    }
    return merged;
  } catch {
    return { ...DEFAULT_APP_PATH_STORE };
  }
}

/** Persists the full store back to LocalStorage. */
export async function saveAppPathStore(store: AppPathStore): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/** Upserts (creates or updates) the mapping for a single project type. */
export async function upsertAppPathMapping(projectType: ProjectType, mapping: AppPathMapping): Promise<AppPathStore> {
  const store = await loadAppPathStore();
  store[projectType] = { ...store[projectType], ...mapping };
  await saveAppPathStore(store);
  return store;
}

/** Removes a custom project type mapping entirely (builtin defaults are restored on next load). */
export async function removeAppPathMapping(projectType: ProjectType): Promise<AppPathStore> {
  const store = await loadAppPathStore();
  delete store[projectType];
  await saveAppPathStore(store);
  return store;
}

/**
 * Resolves the effective app path for a given project type + editor target,
 * falling back to the global extension preference default, and finally to a
 * hardcoded last-resort default if even the preference is empty.
 */
export function resolveAppPath(
  store: AppPathStore,
  projectType: ProjectType,
  target: EditorTarget,
  fallback: string,
): string {
  const mapping = store[projectType];
  const mapped = mapping?.[target];
  if (mapped && mapped.trim().length > 0) return mapped.trim();
  // A custom type registered without a preferred app still opens somewhere sane.
  if (target === "preferred" && mapping?.vscode?.trim()) return mapping.vscode.trim();
  if (fallback && fallback.trim().length > 0) return fallback.trim();

  switch (target) {
    case "preferred":
    case "vscode":
      return "code";
    case "webstorm":
      return "webstorm";
    case "iterm":
      return ITERM;
  }
}

/**
 * Extracts the detection rules for every user-registered type that declares
 * marker files, so a mapping added from "Manage App Paths" actually gets
 * matched against scanned folders instead of sitting unused.
 */
export function customTypeRules(store: AppPathStore): CustomTypeRule[] {
  return Object.entries(store)
    .filter(([type, mapping]) => !(type in DEFAULT_APP_PATH_STORE) && mapping.markers?.length)
    .map(([type, mapping]) => ({ type, markers: mapping.markers ?? [] }));
}

/** Display names for CLI launchers whose command doesn't match the app's name. */
const CLI_DISPLAY_NAMES: Record<string, string> = {
  xed: "Xcode",
  code: "VS Code",
  idea: "IntelliJ IDEA",
  studio: "Android Studio",
  webstorm: "WebStorm",
  pycharm: "PyCharm",
  goland: "GoLand",
  clion: "CLion",
  rubymine: "RubyMine",
};

/** Turns an app path, bundle id, or command into a label: "xed" -> "Xcode". */
export function appDisplayName(resolvedPath: string): string {
  const base = resolvedPath.trim().replace(/\/+$/, "").split("/").pop() ?? resolvedPath;
  if (base.toLowerCase().endsWith(".app")) return base.slice(0, -".app".length);
  if (CLI_DISPLAY_NAMES[base]) return CLI_DISPLAY_NAMES[base];
  if (base.split(".").length > 2) return base.split(".").pop() ?? base;
  return base;
}
