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
      const shortcuts = parseAppPreferences(json, await resolveAppName(fallbackName, fallbackName));
      if (shortcuts.length > 0 && shortcuts[0].category) apps.push({ app: shortcuts[0].category, shortcuts });
    } catch {
      // unreadable plist → skip domain and remember its bundle id so Import All
      // treats the scan as partial and won't delete valid stored entries
      failedApps.add(fallbackName);
    }
  }
  apps.sort((a, b) => a.app.localeCompare(b.app));
  return { apps, failedApps: [...failedApps] };
}
