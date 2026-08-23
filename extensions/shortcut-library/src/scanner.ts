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

export async function discoverMenuShortcuts(): Promise<ScanResult> {
  const hits: string[] = [];
  const prefilterFails: string[] = [];
  for (const p of plistCandidates()) {
    try {
      if (readFileSync(p).includes(MARKER)) hits.push(p);
    } catch {
      // prefilter unreadable → remember its category so a sweep doesn't treat the
      // omission as a removal and delete valid stored entries for this app
      prefilterFails.push(basename(p, ".plist"));
    }
  }

  const apps: DiscoveredApp[] = [];
  const failedApps = new Set<string>();
  for (const id of prefilterFails) failedApps.add(id);

  for (const path of hits) {
    const fallbackName = basename(path, ".plist");
    try {
      const json = await readPlist(path);
      const shortcuts = parseAppPreferences(json, await resolveAppName(fallbackName, fallbackName), fallbackName);
      if (shortcuts.length > 0 && shortcuts[0].category) apps.push({ app: shortcuts[0].category, shortcuts });
    } catch {
      // unreadable plist → skip domain and record its bundle id (the plist filename)
      // so Import All protects that app's stored entries from the destructive sweep
      failedApps.add(fallbackName);
    }
  }
  apps.sort((a, b) => a.app.localeCompare(b.app));
  return { apps, failedApps: pruneReaders(failedApps, apps) };
}

/**
 * A bundle id may span several plist files (main prefs dir + sandbox containers).
 * A bundle is only "failed" if every copy was unreadable: when at least one copy
 * reads cleanly we have fresh data for that bundle, so it must be swept normally —
 * exempting it would leave stale rows from the readable copy in the library and
 * retain old+new bindings for a re-keyed shortcut.
 */
export function pruneReaders(failedApps: Iterable<string>, apps: DiscoveredApp[]): string[] {
  const readable = new Set<string>();
  for (const a of apps) for (const s of a.shortcuts) if (s.bundleId) readable.add(s.bundleId);
  return [...new Set(failedApps)].filter((id) => !readable.has(id));
}
