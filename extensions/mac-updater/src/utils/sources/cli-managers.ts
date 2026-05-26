import { extractCmdError, run } from "../shell";
import { CliPackage, UpdateResult } from "../types";

import * as fs from "fs";

// Filesystem-based binary lookup for each package manager. Lets the extension
// work on Intel Macs (/usr/local/bin) and Apple Silicon (/opt/homebrew/bin)
// alike, plus rbenv/asdf-style shims.
const NPM_CANDIDATES = ["/opt/homebrew/bin/npm", "/usr/local/bin/npm"];
const PIP_CANDIDATES = [
  "/opt/homebrew/bin/pip3",
  "/usr/local/bin/pip3",
  "/opt/homebrew/bin/pip",
  "/usr/local/bin/pip",
];
// Prefer a user-writable Ruby. Skip macOS system Ruby (/usr/bin/gem) — it requires sudo.
const GEM_CANDIDATES = [
  "/opt/homebrew/opt/ruby/bin/gem",
  "/opt/homebrew/bin/gem",
  "/usr/local/opt/ruby/bin/gem",
  "/usr/local/bin/gem",
  `${process.env.HOME}/.rbenv/shims/gem`,
  `${process.env.HOME}/.asdf/shims/gem`,
];

function findFirst(candidates: string[]): string | null {
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function findNpm(): string | null {
  return findFirst(NPM_CANDIDATES);
}
function findPip(): string | null {
  return findFirst(PIP_CANDIDATES);
}
function findGem(): string | null {
  return findFirst(GEM_CANDIDATES);
}

export function isGemAvailable(): boolean {
  return findGem() !== null;
}

// ─────────────────────────────────────────────────────────────────────────────
// All-installed lists (used by the Sources · Packages views)
// ─────────────────────────────────────────────────────────────────────────────

export interface InstalledPkg {
  name: string;
  installedVersion: string;
}

export async function getAllInstalledNpm(): Promise<InstalledPkg[]> {
  const NPM = findNpm();
  if (!NPM) return [];
  try {
    const { stdout } = await run(NPM, ["ls", "-g", "--depth=0", "--json"]);
    const data = JSON.parse(stdout || "{}") as {
      dependencies?: Record<string, { version?: string }>;
    };
    return Object.entries(data.dependencies ?? {}).map(([name, info]) => ({
      name,
      installedVersion: info.version ?? "?",
    }));
  } catch {
    return [];
  }
}

export async function getAllInstalledPip(): Promise<InstalledPkg[]> {
  const PIP = findPip();
  if (!PIP) return [];
  try {
    const { stdout } = await run(PIP, ["list", "--format=json"]);
    const data: { name: string; version: string }[] = JSON.parse(
      stdout || "[]",
    );
    return data.map((p) => ({ name: p.name, installedVersion: p.version }));
  } catch {
    return [];
  }
}

export async function getAllInstalledGems(): Promise<InstalledPkg[]> {
  const GEM = findGem();
  if (!GEM) return [];
  try {
    const { stdout } = await run(GEM, ["list", "--local", "--no-versions"]);
    // gem list output is one name per line (with --no-versions)
    const names = stdout
      .trim()
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    // Need versions separately
    const { stdout: versioned } = await run(GEM, ["list", "--local"]);
    const versionMap = new Map<string, string>();
    for (const line of versioned.split("\n")) {
      const m = line.match(/^(\S+)\s+\(([^)]+)\)$/);
      if (m) versionMap.set(m[1], m[2].split(",")[0].trim());
    }
    return names.map((n) => ({
      name: n,
      installedVersion: versionMap.get(n) ?? "?",
    }));
  } catch {
    return [];
  }
}

export async function getOutdatedNpm(): Promise<CliPackage[]> {
  const NPM = findNpm();
  if (!NPM) return [];
  let stdout = "";
  try {
    const r = await run(NPM, ["outdated", "-g", "--json"]);
    stdout = r.stdout;
  } catch (e: unknown) {
    const err = e as { stdout?: string };
    stdout = err?.stdout ?? "";
  }
  try {
    const data: Record<string, { current: string; latest: string }> =
      JSON.parse(stdout || "{}");
    return Object.entries(data).map(([name, info]) => ({
      id: name,
      name,
      currentVersion: info.current,
      latestVersion: info.latest,
      source: "npm" as const,
    }));
  } catch {
    return [];
  }
}

export async function upgradeNpm(name: string): Promise<UpdateResult> {
  const NPM = findNpm();
  if (!NPM) {
    return {
      name,
      source: "npm",
      success: false,
      error: "npm not found. Install Node.js (brew install node).",
    };
  }
  try {
    await run(NPM, ["install", "-g", `${name}@latest`]);
    return { name, source: "npm", success: true };
  } catch (e) {
    return { name, source: "npm", success: false, error: extractCmdError(e) };
  }
}

export async function upgradeAllNpm(): Promise<UpdateResult> {
  const NPM = findNpm();
  if (!NPM) {
    return {
      name: "npm globals",
      source: "npm",
      success: false,
      error: "npm not found. Install Node.js (brew install node).",
    };
  }
  try {
    await run(NPM, ["update", "-g"]);
    return { name: "npm globals", source: "npm", success: true };
  } catch (e) {
    return {
      name: "npm globals",
      source: "npm",
      success: false,
      error: extractCmdError(e),
    };
  }
}

export async function getOutdatedPip(): Promise<CliPackage[]> {
  const PIP = findPip();
  if (!PIP) return [];
  try {
    const { stdout } = await run(PIP, ["list", "--outdated", "--format=json"]);
    const data: { name: string; version: string; latest_version: string }[] =
      JSON.parse(stdout || "[]");
    return data.map((p) => ({
      id: p.name,
      name: p.name,
      currentVersion: p.version,
      latestVersion: p.latest_version,
      source: "pip" as const,
    }));
  } catch {
    return [];
  }
}

export async function upgradePip(name: string): Promise<UpdateResult> {
  const PIP = findPip();
  if (!PIP) {
    return {
      name,
      source: "pip",
      success: false,
      error: "pip not found. Install Python (brew install python).",
    };
  }
  try {
    await run(PIP, ["install", "--upgrade", name]);
    return { name, source: "pip", success: true };
  } catch (e) {
    return { name, source: "pip", success: false, error: extractCmdError(e) };
  }
}

export async function upgradeAllPip(): Promise<UpdateResult> {
  const PIP = findPip();
  if (!PIP) {
    return {
      name: "pip packages",
      source: "pip",
      success: false,
      error: "pip not found. Install Python (brew install python).",
    };
  }
  try {
    const pkgs = await getOutdatedPip();
    for (const p of pkgs) await run(PIP, ["install", "--upgrade", p.name]);
    return { name: "pip packages", source: "pip", success: true };
  } catch (e) {
    return {
      name: "pip packages",
      source: "pip",
      success: false,
      error: extractCmdError(e),
    };
  }
}

export async function getOutdatedGems(): Promise<CliPackage[]> {
  const GEM = findGem();
  if (!GEM) return [];
  try {
    const { stdout } = await run(GEM, ["outdated"]);
    return stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const m = line.match(/^(\S+)\s+\(([^<]+)\s*<\s*([^)]+)\)$/);
        if (!m) return null;
        return {
          id: m[1],
          name: m[1],
          currentVersion: m[2].trim(),
          latestVersion: m[3].trim(),
          source: "gem" as const,
        } as CliPackage;
      })
      .filter((p): p is CliPackage => p !== null);
  } catch {
    return [];
  }
}

export async function upgradeGem(name: string): Promise<UpdateResult> {
  const GEM = findGem();
  if (!GEM) {
    return {
      name,
      source: "gem",
      success: false,
      error:
        "No user-writable Ruby found. Install Homebrew Ruby: brew install ruby",
    };
  }
  try {
    await run(GEM, ["update", name]);
    return { name, source: "gem", success: true };
  } catch (e) {
    return { name, source: "gem", success: false, error: extractCmdError(e) };
  }
}

export async function upgradeAllGems(): Promise<UpdateResult> {
  const GEM = findGem();
  if (!GEM) {
    return {
      name: "Ruby gems",
      source: "gem",
      success: false,
      error:
        "macOS system Ruby requires sudo. Install Homebrew Ruby first: brew install ruby",
    };
  }
  try {
    await run(GEM, ["update"]);
    return { name: "Ruby gems", source: "gem", success: true };
  } catch (e) {
    return {
      name: "Ruby gems",
      source: "gem",
      success: false,
      error: extractCmdError(e),
    };
  }
}
