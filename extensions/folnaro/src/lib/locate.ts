import { accessSync, constants, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { FolnaroError } from "./errors";

/** Bundle ID of the Folnaro app (CLAUDE.md). */
export const BUNDLE_ID = "app.folnaro.mac";

/** Path of the helper inside the app bundle (docs/mcp/README.md, "Where the server lives"). */
export const HELPER_IN_BUNDLE = join("Contents", "MacOS", "folnaro-mcp");

export interface HelperCommand {
  command: string;
  args: string[];
  /** The app bundle, when the helper is the bundled one. */
  appPath?: string;
}

export interface LocateOptions {
  /** Preference "Helper Path": a folnaro-mcp binary or a Node script that speaks the same protocol. */
  overridePath?: string;
  /** Node binary to run a `.mjs`/`.js` override with (Raycast's own `process.execPath`). */
  nodePath?: string;
  /** Extra app locations, e.g. from Spotlight (`mdfind kMDItemCFBundleIdentifier == app.folnaro.mac`). */
  spotlightPaths?: () => string[];
  exists?: (path: string) => boolean;
  isExecutable?: (path: string) => boolean;
  home?: string;
}

function defaultIsExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** Places Folnaro is usually installed, in order. */
export function candidateApps(home: string = homedir()): string[] {
  return ["/Applications/Folnaro.app", join(home, "Applications", "Folnaro.app")];
}

/**
 * Finds the helper to start. Throws `appNotInstalled` when no Folnaro.app is found, and
 * `helperMissing` when the app is there but has no executable folnaro-mcp (an old or damaged copy).
 */
export function locateHelper(options: LocateOptions = {}): HelperCommand {
  const exists = options.exists ?? existsSync;
  const isExecutable = options.isExecutable ?? defaultIsExecutable;

  const override = options.overridePath?.trim();
  if (override) {
    const path = override.startsWith("~/") ? join(options.home ?? homedir(), override.slice(2)) : override;
    if (!exists(path)) {
      throw new FolnaroError("helperMissing", `No helper at ${path}.`);
    }
    if (/\.(mjs|cjs|js)$/.test(path)) {
      return { command: options.nodePath ?? process.execPath, args: [path] };
    }
    if (!isExecutable(path)) {
      throw new FolnaroError("helperMissing", `${path} is not executable.`);
    }
    return { command: path, args: [] };
  }

  const apps = candidateApps(options.home);
  let app = apps.find((path) => exists(path));
  if (!app && options.spotlightPaths) {
    app = options.spotlightPaths().find((path) => path.endsWith(".app") && exists(path));
  }
  if (!app) {
    throw new FolnaroError("appNotInstalled", "Folnaro.app was not found.");
  }
  const helper = join(app, HELPER_IN_BUNDLE);
  if (!exists(helper) || !isExecutable(helper)) {
    throw new FolnaroError("helperMissing", `${helper} is missing or not executable.`);
  }
  return { command: helper, args: [], appPath: app };
}
