/*
 * Handing something off to the MarkdownOS app.
 *
 * Kept apart from notes.ts, which reads the vault as files: this module is about the running
 * application — finding the right installed instance and speaking its deep-link URL scheme.
 */

import { execFileSync } from "child_process";
import { readFileSync, realpathSync } from "fs";
import * as os from "os";
import * as path from "path";
import { open, showToast, Toast } from "@raycast/api";

const APP_BUNDLE_ID_PREFIX = "app.glaze.macos.mf0c4ifk";
const LEGACY_VAULT_PATH = path.join(os.homedir(), "Documents", "Owl Vault");

/** `path.resolve` only normalizes `.`/`..` — it leaves symlinks untouched, so a vault reached
 *  through one (an iCloud alias, a synced-folder shortcut) would never match the app's own
 *  `vault-location.json` even when it's genuinely the same directory. Falls back to `path.resolve`
 *  if the path doesn't exist yet (a stale `vault-location.json`, or a preference not saved yet) —
 *  `realpathSync` throws there, and this has to keep returning SOMETHING comparable rather than
 *  crash the whole app lookup over one bad path. */
function canonicalVaultPath(vaultPath: string): string {
  try {
    return realpathSync(vaultPath);
  } catch {
    return path.resolve(vaultPath);
  }
}

interface AppInstance {
  /** The .app bundle's own path — for launching it directly (Open App), as opposed to a deep
   *  link, which needs the scheme below instead. */
  appPath: string;
  scheme: string;
}

/**
 * Finds the installed MarkdownOS instance whose OWN configured vault matches the one this
 * extension is pointed at — not just any installed MarkdownOS, since more than one build (a local
 * dev build alongside a Store build) can be installed at once, each pointed at a different vault,
 * each with its own scheme.
 *
 * No caching: this shells out to Spotlight + plutil on every call. Acceptable for a manual,
 * one-at-a-time action like "open this note" — not something worth the complexity of a cache
 * that could go stale the moment either app's vault preference changes.
 */
function findAppForVault(vaultPath: string): AppInstance | null {
  let appPaths: string[];
  try {
    const output = execFileSync("mdfind", [`kMDItemCFBundleIdentifier == '${APP_BUNDLE_ID_PREFIX}*'cd`], {
      encoding: "utf8",
    });
    appPaths = output.split("\n").filter(Boolean);
  } catch {
    return null;
  }

  const targetVault = canonicalVaultPath(vaultPath);

  for (const appPath of appPaths) {
    let info: {
      CFBundleIdentifier?: string;
      CFBundleURLTypes?: { CFBundleURLName?: string; CFBundleURLSchemes?: string[] }[];
    };
    try {
      const json = execFileSync("plutil", ["-convert", "json", "-o", "-", path.join(appPath, "Contents/Info.plist")], {
        encoding: "utf8",
      });
      info = JSON.parse(json);
    } catch {
      continue;
    }
    const bundleId = info.CFBundleIdentifier;
    if (!bundleId) continue;

    const vaultLocationFile = path.join(os.homedir(), "Library/Application Support", bundleId, "vault-location.json");
    let appVaultPath = LEGACY_VAULT_PATH;
    try {
      const location = JSON.parse(readFileSync(vaultLocationFile, "utf8")) as { path?: string };
      if (location.path) appVaultPath = location.path;
    } catch {
      // No vault-location.json — this instance is on the legacy default, already assumed above.
    }
    if (canonicalVaultPath(appVaultPath) !== targetVault) continue;

    const ownEntry = info.CFBundleURLTypes?.find((entry) => entry.CFBundleURLName === bundleId);
    const scheme = ownEntry?.CFBundleURLSchemes?.[0];
    if (scheme) return { appPath, scheme };
  }
  return null;
}

async function reportAppNotFound(): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "Couldn't find MarkdownOS for this vault",
    message: "Make sure MarkdownOS is installed and pointed at this same vault folder.",
  });
}

/**
 * Opens a deep link into the MarkdownOS instance that owns this vault.
 *
 * Every param goes in the query string rather than the host or path, matching what the app's own
 * parser expects — see the deep-link section of its main/index.ts for why a non-http(s) scheme is
 * kept to a flat set of params.
 *
 * Failure is reported here rather than returned, because it is the same failure for every caller
 * and there is nothing any of them could do differently about it.
 */
export async function openInApp(vaultPath: string, params: Record<string, string>): Promise<boolean> {
  const app = findAppForVault(vaultPath);
  if (!app) {
    await reportAppNotFound();
    return false;
  }
  const query = Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
  await open(`${app.scheme}://open?${query}`);
  return true;
}

/**
 * Brings the app itself forward — no deep link, since there's nothing to navigate to. Launching
 * the bundle directly rather than going through a deep link at all: an empty-query `scheme://open`
 * would still have to be given SOME `type` the app's parser recognises, for no reason when the
 * only goal is "show the app."
 */
export async function openApp(vaultPath: string): Promise<boolean> {
  const app = findAppForVault(vaultPath);
  if (!app) {
    await reportAppNotFound();
    return false;
  }
  await open(app.appPath);
  return true;
}
