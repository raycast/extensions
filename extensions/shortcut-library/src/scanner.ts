import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import type { Shortcut } from "./types";
import { parseAppPreferences } from "./discover";

const execFileAsync = promisify(execFile);
const MARKER = "NSUserKeyEquivalents";

export interface DiscoveredApp {
  app: string;
  shortcuts: Shortcut[];
}

export interface ScanResult {
  apps: DiscoveredApp[];
  failedApps: string[];
  /** every plist positively parsed this run, including ones with no shortcuts left */
  readFiles: string[];
}

function plistCandidates(): string[] {
  const home = homedir();
  const dirs = [join(home, "Library", "Preferences")];
  const containers = join(home, "Library", "Containers");
  if (existsSync(containers)) {
    for (const entry of readdirSync(containers)) {
      const dir = join(containers, entry, "Data", "Library", "Preferences");
      if (existsSync(dir)) dirs.push(dir);
    }
  }

  const files: string[] = [];
  for (const dir of dirs) {
    for (const f of readdirSync(dir)) {
      if (f.endsWith(".plist")) files.push(join(dir, f));
    }
  }
  return files;
}

async function readPlist(path: string): Promise<unknown> {
  const { stdout } = await execFileAsync("/usr/bin/plutil", ["-convert", "json", "-o", "-", path]);
  return JSON.parse(stdout);
}

async function resolveAppName(bundleId: string, fallback: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("/usr/bin/mdfind", [`kMDItemCFBundleIdentifier == '${bundleId}'`]);
    const hit = stdout
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.endsWith(".app"));
    if (hit) return basename(hit).replace(/\.app$/, "");
  } catch {
    // Spotlight unavailable → fall back to bundle id
  }
  return fallback;
}

export async function discoverMenuShortcuts(files: string[] = plistCandidates()): Promise<ScanResult> {
  const hits: string[] = [];
  const failedFiles: string[] = [];
  const readFiles: string[] = [];
  for (const p of files) {
    try {
      if (readFileSync(p).includes(MARKER)) {
        hits.push(p);
      } else {
        // Readable, but macOS dropped NSUserKeyEquivalents after the last
        // customization was deleted. Skip plutil, still record an empty read
        // so Import All can drop stale rows from this file.
        readFiles.push(p);
      }
    } catch {
      // unreadable at prefilter → its stored entries stay untouched by the sweep
      failedFiles.push(p);
    }
  }

  const apps: DiscoveredApp[] = [];
  for (const path of hits) {
    const fallbackName = basename(path, ".plist");
    try {
      const json = await readPlist(path);
      const shortcuts = parseAppPreferences(json, await resolveAppName(fallbackName, fallbackName), path);
      // record the file even when no shortcuts survive parsing: an empty result is
      // positive evidence the user removed their customizations, which Import All
      // needs so stale rows from this file are cleaned up instead of lingering
      readFiles.push(path);
      if (shortcuts.length > 0 && shortcuts[0].category) {
        const appName = shortcuts[0].category;
        const bucket = apps.find((a) => a.app === appName);
        if (bucket) bucket.shortcuts.push(...shortcuts);
        else apps.push({ app: appName, shortcuts });
      }
    } catch {
      // unreadable plist → skip domain; its file is simply absent from the sweep's
      // freshly-read set, so entries imported from it are never removed
      failedFiles.push(path);
    }
  }
  for (const app of apps) {
    app.shortcuts.sort((a, b) => a.title.localeCompare(b.title));
  }
  apps.sort((a, b) => a.app.localeCompare(b.app));
  return { apps, failedApps: failedFiles, readFiles };
}
