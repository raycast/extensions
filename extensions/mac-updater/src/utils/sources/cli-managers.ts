import { extractCmdError, run } from "../shell";
import { CliPackage, UpdateResult } from "../types";

import * as fs from "fs";
import * as path from "path";

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
// PEP 668 — "externally managed" Python detection
//
// Homebrew (and Debian/Ubuntu) drop an EXTERNALLY-MANAGED marker into the
// interpreter's stdlib dir. When present, pip refuses to install/upgrade into
// that environment because its packages are owned by the OS package manager
// (brew). Force-overriding with --break-system-packages would clobber brew's
// Python and can break it — exactly what PEP 668 protects against.
//
// For us this means: outdated packages in a brew-managed Python aren't
// independently upgradable via pip. They get bumped when the user runs
// `brew upgrade` (which updates the python@3.x formula). So we treat them as
// brew-managed: exclude them from the actionable pip-updates list, and if
// anything tries to upgrade one directly, return a clear message instead of
// pip's cryptic error.
// ─────────────────────────────────────────────────────────────────────────────

/** Best-effort: derive the python interpreter that backs a given pip binary. */
function findPipPython(pip: string): string | null {
  const dir = path.dirname(pip);
  const base = path.basename(pip); // "pip3" or "pip"
  // pip3 → python3, pip → python (same bin dir as the pip we found)
  const derived = path.join(dir, base.replace(/^pip/, "python"));
  for (const c of [
    derived,
    path.join(dir, "python3"),
    path.join(dir, "python"),
  ]) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

// Cached per session — the marker doesn't appear/disappear while Raycast runs.
// Keyed by pip path so a theoretical change in which pip we find is still correct.
const externallyManagedCache = new Map<string, boolean>();

export async function isPipExternallyManaged(pip: string): Promise<boolean> {
  const cached = externallyManagedCache.get(pip);
  if (cached !== undefined) return cached;
  const py = findPipPython(pip);
  if (!py) {
    externallyManagedCache.set(pip, false);
    return false;
  }
  try {
    const { stdout } = await run(py, [
      "-c",
      "import sysconfig,os;print(1 if os.path.exists(os.path.join(sysconfig.get_path('stdlib'),'EXTERNALLY-MANAGED')) else 0)",
    ]);
    const managed = stdout.trim() === "1";
    externallyManagedCache.set(pip, managed);
    return managed;
  } catch {
    externallyManagedCache.set(pip, false);
    return false;
  }
}

/** True if a pip error is the PEP 668 externally-managed refusal. */
export function isExternallyManagedError(raw: string): boolean {
  return /externally[-\s]managed[-\s]environment|externally managed/i.test(raw);
}

const PIP_BREW_MANAGED_MSG =
  "Managed by Homebrew's Python — it updates when you run `brew upgrade`, " +
  "not via pip (PEP 668). To manage your own Python packages independently, " +
  "use a virtualenv or pipx.";

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
  // If pip's Python is externally managed (Homebrew), its packages are
  // brew-owned and can't be safely pip-upgraded. They update via `brew upgrade`,
  // so don't surface them as actionable pip updates — that just leads to a
  // PEP 668 failure when the user clicks Update. (They still appear in the
  // full inventory via getAllInstalledPip.)
  if (await isPipExternallyManaged(PIP)) return [];
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
  // Brew-managed Python: don't attempt — the upgrade would fail PEP 668 (or
  // worse, need --break-system-packages and clobber brew's Python). Tell the
  // user it's handled by brew. This guards direct calls from the inventory view.
  if (await isPipExternallyManaged(PIP)) {
    return { name, source: "pip", success: false, error: PIP_BREW_MANAGED_MSG };
  }
  try {
    await run(PIP, ["install", "--upgrade", name]);
    return { name, source: "pip", success: true };
  } catch (e) {
    // Belt-and-suspenders: if detection somehow missed it, translate the raw
    // PEP 668 error into the friendly message instead of leaking pip's noise.
    const raw = extractCmdError(e);
    return {
      name,
      source: "pip",
      success: false,
      error: isExternallyManagedError(raw) ? PIP_BREW_MANAGED_MSG : raw,
    };
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
  if (await isPipExternallyManaged(PIP)) {
    // Nothing to do — brew-managed packages update via `brew upgrade`.
    // Report success with the explanatory note so the bulk queue doesn't show
    // a scary red failure for something that's working as intended.
    return {
      name: "pip packages",
      source: "pip",
      success: true,
    };
  }
  try {
    const pkgs = await getOutdatedPip();
    for (const p of pkgs) await run(PIP, ["install", "--upgrade", p.name]);
    return { name: "pip packages", source: "pip", success: true };
  } catch (e) {
    const raw = extractCmdError(e);
    return {
      name: "pip packages",
      source: "pip",
      success: false,
      error: isExternallyManagedError(raw) ? PIP_BREW_MANAGED_MSG : raw,
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
