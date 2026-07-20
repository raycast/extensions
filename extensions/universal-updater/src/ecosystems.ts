import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { withTimeout } from "./utils";

const execFileAsync = promisify(execFile);

// ─── Version Diff & LocalStorage Helpers ─────────────────────────────────────

export type VersionDiffType = "major" | "minor" | "patch" | "unknown";

export function getVersionDiffType(
  current: string,
  latest: string,
): VersionDiffType {
  try {
    const cleanCurrent = current.replace(/^[v^~]/, "").trim();
    const cleanLatest = latest.replace(/^[v^~]/, "").trim();

    const currParts = cleanCurrent.split(".").map((p) => parseInt(p, 10));
    const latestParts = cleanLatest.split(".").map((p) => parseInt(p, 10));

    if (isNaN(currParts[0]) || isNaN(latestParts[0])) return "unknown";

    if (currParts[0] !== latestParts[0]) return "major";
    if (currParts[1] !== latestParts[1]) return "minor";
    if (currParts[2] !== latestParts[2]) return "patch";
    return "unknown";
  } catch {
    return "unknown";
  }
}

// ─── Canonical LocalStorage keys ─────────────────────────────────────────────
// All files MUST use these — never define local copies.
export const PINNED_STORAGE_KEY = "UNIVERSAL_UPDATER_PINNED_PACKAGES";
export const IGNORED_STORAGE_KEY = "UNIVERSAL_UPDATER_IGNORED_PACKAGES";

export async function getPinnedPackages(): Promise<string[]> {
  const data = await LocalStorage.getItem<string>(PINNED_STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function togglePinPackage(packageKey: string): Promise<boolean> {
  const pins = await getPinnedPackages();
  const index = pins.indexOf(packageKey);
  let isPinned = false;
  if (index >= 0) {
    pins.splice(index, 1);
  } else {
    pins.push(packageKey);
    isPinned = true;
  }
  await LocalStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(pins));
  return isPinned;
}

export async function getIgnoredPackages(): Promise<string[]> {
  const data = await LocalStorage.getItem<string>(IGNORED_STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function addIgnoredPackage(name: string): Promise<void> {
  const ignored = await getIgnoredPackages();
  if (!ignored.includes(name)) {
    ignored.push(name);
    await LocalStorage.setItem(IGNORED_STORAGE_KEY, JSON.stringify(ignored));
  }
}

export async function removeIgnoredPackage(name: string): Promise<void> {
  const ignored = await getIgnoredPackages();
  const updated = ignored.filter((n) => n !== name);
  await LocalStorage.setItem(IGNORED_STORAGE_KEY, JSON.stringify(updated));
}

export async function toggleIgnorePackage(
  packageKey: string,
): Promise<boolean> {
  const ignored = await getIgnoredPackages();
  const index = ignored.indexOf(packageKey);
  let isIgnored = false;
  if (index >= 0) {
    ignored.splice(index, 1);
  } else {
    ignored.push(packageKey);
    isIgnored = true;
  }
  await LocalStorage.setItem(IGNORED_STORAGE_KEY, JSON.stringify(ignored));
  return isIgnored;
}

// ─── Shared shell helper ───────────────────────────────────────────────────────
// Resolve common tool paths on macOS so Raycast can find user-installed CLIs.
const SHELL_ENV = {
  ...process.env,
  PATH: [
    "/opt/homebrew/bin", // Apple Silicon Homebrew
    "/usr/local/bin", // Intel Homebrew
    "/opt/homebrew/sbin",
    "/usr/local/sbin",
    `${homedir()}/.cargo/bin`,
    `${homedir()}/.local/bin`,
    `${homedir()}/.npm-global/bin`,
    `${homedir()}/bin`,
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
    process.env.PATH ?? "",
  ].join(":"),
  FORCE_COLOR: "0",
};

let cachedShellPath = "";

async function getShellPath(): Promise<string> {
  if (cachedShellPath) return cachedShellPath;
  try {
    const { stdout } = await execFileAsync("/bin/zsh", ["-lc", "echo $PATH"]);
    const resolved = stdout.trim();
    if (resolved) {
      cachedShellPath = resolved;
      return resolved;
    }
  } catch {
    // Ignore and fall back
  }
  return "";
}

const resolvedPaths: Record<string, string> = {};
let cachedFnmPath = "";

async function getFnmPath(): Promise<string> {
  if (cachedFnmPath) return cachedFnmPath;
  try {
    const { stdout } = await execFileAsync("fnm", ["env", "--shell", "zsh"]);
    const match = /export PATH="([^"]+)":/.exec(stdout);
    if (match && match[1]) {
      cachedFnmPath = match[1];
      return cachedFnmPath;
    }
  } catch {
    // Ignore if fnm not installed or failed
  }
  return "";
}

async function findBinary(
  bin: string,
  ecosystem?: EcosystemId,
): Promise<string | null> {
  if (resolvedPaths[bin] && existsSync(resolvedPaths[bin]))
    return resolvedPaths[bin];

  // 1. Check current process/resolved PATH first
  let customPath = "";
  try {
    const prefs = getPreferenceValues<Record<string, any>>();
    if (ecosystem) {
      const key = `customPath${ecosystem.charAt(0).toUpperCase() + ecosystem.slice(1)}`;
      if (prefs[key] && prefs[key].trim()) {
        customPath = prefs[key].trim();
      }
    }
    if (!customPath && prefs.customPath && prefs.customPath.trim()) {
      customPath = prefs.customPath.trim();
    }
  } catch {
    // Ignore
  }

  const shellPath = await getShellPath();
  const fnmPath = await getFnmPath();

  let searchPath = SHELL_ENV.PATH;
  if (fnmPath) {
    searchPath = `${fnmPath}:${searchPath}`;
  }
  if (customPath) {
    searchPath = `${customPath}:${searchPath}`;
  }
  if (shellPath) {
    searchPath = `${shellPath}:${searchPath}`;
  }

  const pathDirs = searchPath.split(":");
  for (const dir of pathDirs) {
    if (!dir) continue;
    const path = join(dir, bin);
    if (existsSync(path)) {
      resolvedPaths[bin] = path;
      return path;
    }
  }

  // 2. Fall back to hardcoded common directories
  const searchDirs = [
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
    join(homedir(), ".pub-cache/bin"),
    join(homedir(), ".cargo/bin"),
    join(homedir(), ".local/share/fnm/bin"),
    join(homedir(), ".nvm/versions/node"),
  ];
  for (const dir of searchDirs) {
    const path = join(dir, bin);
    if (existsSync(path)) {
      resolvedPaths[bin] = path;
      return path;
    }
  }

  // 3. Fall back to zsh 'which' detection
  try {
    const { stdout } = await execFileAsync("/bin/zsh", ["-lc", `which ${bin}`]);
    const resolved = stdout.trim();
    if (resolved && existsSync(resolved)) {
      resolvedPaths[bin] = resolved;
      return resolved;
    }
  } catch {
    // ignore
  }

  return null;
}

export async function run(
  cmd: string,
  ecosystem?: EcosystemId,
): Promise<string> {
  const trimmedCmd = cmd.trim();
  const parts = trimmedCmd.split(/\s+/);
  const bin = parts[0] || "";

  let customPath = "";
  try {
    const prefs = getPreferenceValues<Record<string, any>>();
    if (ecosystem) {
      const key = `customPath${ecosystem.charAt(0).toUpperCase() + ecosystem.slice(1)}`;
      if (prefs[key] && prefs[key].trim()) {
        customPath = prefs[key].trim();
      }
    }
    if (!customPath && prefs.customPath && prefs.customPath.trim()) {
      customPath = prefs.customPath.trim();
    }
  } catch {
    // Preferences not fully loaded yet
  }

  const shellPath = await getShellPath();
  const fnmPath = await getFnmPath();

  let activePath = SHELL_ENV.PATH;
  if (fnmPath) {
    activePath = `${fnmPath}:${activePath}`;
  }
  if (customPath) {
    activePath = `${customPath}:${activePath}`;
  }
  if (shellPath) {
    activePath = `${shellPath}:${activePath}`;
  }

  const runEnv = {
    ...process.env,
    PATH: activePath,
    FORCE_COLOR: "0",
  };

  // If it's a simple command without pipes, shell redirection, operators, or variables, run it directly
  const hasShellSpecials = /[|&;<>()$`"\\]/.test(trimmedCmd);
  if (bin && !hasShellSpecials) {
    const binPath = await findBinary(bin, ecosystem);
    if (binPath) {
      const args = parts.slice(1);
      try {
        const { stdout } = await execFileAsync(binPath, args, {
          env: runEnv,
        });
        return stdout.trim();
      } catch {
        // Fall back to zsh login shell below if direct execution fails
      }
    }
  }

  try {
    const { stdout } = await execFileAsync("/bin/zsh", ["-lc", cmd], {
      env: runEnv,
    });
    return stdout.trim();
  } catch (err: any) {
    const stdout = err && err.stdout ? String(err.stdout).trim() : "";
    const stderr = err && err.stderr ? String(err.stderr).trim() : "";
    const message = err?.message ?? String(err);
    throw new Error(
      `${message}${stderr ? "\nSTDERR: " + stderr : ""}${stdout ? "\nSTDOUT: " + stdout : ""}`,
    );
  }
}

function quoteShellArg(value: string): string {
  return "'" + value.replaceAll("'", "'\"'\"'") + "'";
}

export function getPackageUrl(
  ecosystem: string,
  name: string,
  subtype?: string,
): string | undefined {
  try {
    const safeName = encodeURIComponent(name);
    switch (ecosystem) {
      case "brew":
        if (subtype === "cask")
          return `https://formulae.brew.sh/cask/${safeName}`;
        return `https://formulae.brew.sh/formula/${safeName}`;
      case "npm":
      case "yarn":
      case "pnpm":
      case "bun":
        return `https://www.npmjs.com/package/${safeName}`;
      case "deno":
        return `https://deno.land/x/${safeName}`;
      case "composer":
        return `https://packagist.org/packages/${safeName}`;
      case "pip":
      case "pipx":
        return `https://pypi.org/project/${safeName}/`;
      case "cargo":
        return `https://crates.io/crates/${safeName}`;
      case "gem":
        return `https://rubygems.org/gems/${safeName}`;
      case "go":
        return `https://pkg.go.dev/${name}`;
      default:
        return undefined;
    }
  } catch {
    return undefined;
  }
}

export function getChangelogUrl(
  ecosystem: string,
  name: string,
): string | undefined {
  try {
    const safeName = encodeURIComponent(name);
    switch (ecosystem) {
      case "npm":
      case "yarn":
      case "pnpm":
      case "bun":
        return `https://www.npmjs.com/package/${safeName}?activeTab=versions`;
      case "deno":
        return `https://deno.land/x/${safeName}`;
      case "composer":
        return `https://packagist.org/packages/${safeName}#releases`;
      case "pip":
      case "pipx":
        return `https://pypi.org/project/${safeName}/#history`;
      case "cargo":
        return `https://crates.io/crates/${safeName}/versions`;
      case "gem":
        return `https://rubygems.org/gems/${safeName}/versions`;
      case "go":
        return `https://pkg.go.dev/${name}?tab=versions`;
      case "brew":
        // Link to the specific formula page which shows version history
        return `https://formulae.brew.sh/formula/${safeName}`;
      default:
        return undefined;
    }
  } catch {
    return undefined;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type EcosystemId =
  | "brew"
  | "npm"
  | "yarn"
  | "pnpm"
  | "pip"
  | "pipx"
  | "cargo"
  | "gem"
  | "mas"
  | "go"
  | "bun"
  | "deno"
  | "composer";

export async function isEcosystemAvailable(id: EcosystemId): Promise<boolean> {
  try {
    switch (id) {
      case "brew":
        await run("command -v brew", "brew");
        return true;
      case "npm":
        await run("command -v npm", "npm");
        return true;
      case "yarn":
        await run("command -v yarn", "yarn");
        return true;
      case "pnpm":
        await run("command -v pnpm", "pnpm");
        return true;
      case "pip":
        // resolvePipCmd returns a command string even if pip isn't present; validate it
        try {
          const cmd = await resolvePipCmd();
          await run(`command -v ${cmd.split(" ")[0]}`, "pip");
          return true;
        } catch {
          return false;
        }
      case "pipx":
        await run("command -v pipx", "pipx");
        return true;
      case "cargo":
        await run("command -v cargo", "cargo");
        return true;
      case "gem":
        await run("command -v gem", "gem");
        return true;
      case "mas":
        await run("command -v mas", "mas");
        return true;
      case "go":
        await run("command -v go", "go");
        return true;
      case "bun":
        await run("command -v bun", "bun");
        return true;
      case "deno":
        await run("command -v deno", "deno");
        return true;
      case "composer":
        await run("command -v composer", "composer");
        return true;
      default:
        return false;
    }
  } catch {
    return false;
  }
}

export interface OutdatedPackage {
  name: string;
  current: string;
  latest: string;
  website?: string;
  changelog?: string;
}

export interface EcosystemStatus {
  id: EcosystemId;
  name: string;
  enabled: boolean;
  packages: OutdatedPackage[];
  error?: string;
  /** true while still loading */
  loading?: boolean;
}

// ─── Homebrew ─────────────────────────────────────────────────────────────────

export async function checkBrew(): Promise<OutdatedPackage[]> {
  const prefs = getPreferenceValues<Preferences>();
  const cmd = prefs.enableBrewGreedy
    ? "brew outdated --json=v2 --greedy"
    : "brew outdated --json=v2";
  const raw = await run(cmd, "brew");
  const json = JSON.parse(raw);

  const formulae: OutdatedPackage[] = (json?.formulae ?? []).map((f: any) => ({
    name: f.name,
    current: f.installed_versions?.[0] ?? "?",
    latest: f.current_version ?? "?",
    website: getPackageUrl("brew", f.name, "formula"),
    changelog: getChangelogUrl("brew", f.name),
  }));

  const casks: OutdatedPackage[] = (json?.casks ?? []).map((c: any) => ({
    name: c.name,
    current: Array.isArray(c.installed_versions)
      ? c.installed_versions.join(", ")
      : (c.installed_versions ?? "?"),
    latest: c.current_version ?? "?",
    website: getPackageUrl("brew", c.name, "cask"),
    changelog: getChangelogUrl("brew", c.name),
  }));

  return [...formulae, ...casks];
}

export async function upgradeBrew(): Promise<string> {
  const prefs = getPreferenceValues<Preferences>();
  await run("brew update", "brew");
  const upgradeCmd = prefs.enableBrewGreedy
    ? "brew upgrade --greedy && brew upgrade --cask --greedy"
    : "brew upgrade && brew upgrade --cask";
  const out = await run(upgradeCmd, "brew");
  return out;
}

// ─── npm (global) ─────────────────────────────────────────────────────────────

export async function checkNpm(): Promise<OutdatedPackage[]> {
  try {
    const raw = await run("npm outdated -g --json", "npm");
    if (!raw) return [];
    const json = JSON.parse(raw);
    return Object.entries(json).map(([name, info]: [string, any]) => ({
      name,
      current: info.current ?? "?",
      latest: info.latest ?? "?",
      website: getPackageUrl("npm", name),
      changelog: getChangelogUrl("npm", name),
    }));
  } catch (err: any) {
    // npm outdated exits with code 1 when packages are outdated — parse stdout anyway
    const stdout = err?.stdout?.trim() ?? "";
    if (!stdout) return [];
    const json = JSON.parse(stdout);
    return Object.entries(json).map(([name, info]: [string, any]) => ({
      name,
      current: info.current ?? "?",
      latest: info.latest ?? "?",
      website: getPackageUrl("npm", name),
      changelog: getChangelogUrl("npm", name),
    }));
  }
}

export async function upgradeNpm(): Promise<string> {
  return run("npm update -g", "npm");
}

// ─── pip ──────────────────────────────────────────────────────────────────────

async function resolvePipCmd(): Promise<string> {
  try {
    await run("command -v pip", "pip");
    return "pip";
  } catch {
    try {
      await run("command -v pip3", "pip");
      return "pip3";
    } catch {
      return "python3 -m pip";
    }
  }
}

export async function checkPip(): Promise<OutdatedPackage[]> {
  const pipCmd = await resolvePipCmd();
  try {
    const raw = await run(`${pipCmd} list --outdated --format=json`, "pip");
    const cleanRaw = raw
      .split("\n")
      .filter((l) => !l.startsWith("WARNING:") && !l.startsWith("DEPRECATION:"))
      .join("\n");
    const json: Array<{
      name: string;
      version: string;
      latest_version: string;
    }> = JSON.parse(cleanRaw);
    return json.map((p) => ({
      name: p.name,
      current: p.version,
      latest: p.latest_version,
      website: getPackageUrl("pip", p.name),
      changelog: getChangelogUrl("pip", p.name),
    }));
  } catch (err: any) {
    const stdout = err?.stdout?.trim() ?? "";
    if (stdout) {
      try {
        const cleanRaw = stdout
          .split("\n")
          .filter(
            (l: string) =>
              !l.startsWith("WARNING:") && !l.startsWith("DEPRECATION:"),
          )
          .join("\n");
        const json = JSON.parse(cleanRaw);
        return json.map((p: any) => ({
          name: p.name,
          current: p.version,
          latest: p.latest_version,
          website: getPackageUrl("pip", p.name),
          changelog: getChangelogUrl("pip", p.name),
        }));
      } catch {
        // fall through to error
      }
    }
    throw new Error(
      "pip not available or failed. Ensure pip/pip3 is installed.",
    );
  }
}

export async function upgradePip(): Promise<string> {
  const pkgs = await checkPip();
  if (pkgs.length === 0) return "All pip packages are up to date.";
  const names = pkgs.map((p) => quoteShellArg(p.name)).join(" ");
  const pipCmd = await resolvePipCmd();
  return run(`${pipCmd} install --upgrade ${names}`, "pip");
}

// ─── pipx ─────────────────────────────────────────────────────────────────────

export async function checkPipx(): Promise<OutdatedPackage[]> {
  // First try pipx outdated (pipx >= 1.4)
  try {
    const raw = await run("pipx outdated --json", "pipx");
    if (raw) {
      const json = JSON.parse(raw);
      const outdated: Array<{
        package: string;
        current: string;
        latest: string;
      }> = json?.outdated ?? json ?? [];
      if (Array.isArray(outdated) && outdated.length > 0) {
        return outdated.map((p: any) => ({
          name: p.package ?? p.name,
          current: p.current ?? "?",
          latest: p.latest ?? "?",
          website: getPackageUrl("pip", p.package ?? p.name),
          changelog: getChangelogUrl("pip", p.package ?? p.name),
        }));
      }
    }
  } catch {
    // Fall through to list-based approach
  }

  // Fallback: list all and mark as needing check
  const raw = await run("pipx list --json", "pipx");
  const json = JSON.parse(raw);
  const venvs: Record<string, any> = json?.venvs ?? {};

  const results: OutdatedPackage[] = [];
  for (const [name, info] of Object.entries(venvs)) {
    const pkg = info?.metadata?.main_package;
    if (pkg) {
      results.push({
        name,
        current: pkg.package_version ?? "?",
        latest: "(run pipx upgrade-all to check)",
        website: getPackageUrl("pip", name),
        changelog: getChangelogUrl("pip", name),
      });
    }
  }
  return results;
}

export async function upgradePipx(): Promise<string> {
  return run("pipx upgrade-all", "pipx");
}

// ─── cargo (requires cargo-update: `cargo install cargo-update`) ──────────────

export async function checkCargo(): Promise<OutdatedPackage[]> {
  try {
    const raw = await run("cargo install-update --list", "cargo");
    const lines = raw.split("\n").filter((l) => l.includes("Yes"));
    return lines.map((line) => {
      const parts = line.trim().split(/\s+/);
      const name = parts[0] ?? "?";
      return {
        name,
        current: parts[1] ?? "?",
        latest: parts[2] ?? "?",
        website: getPackageUrl("cargo", name),
        changelog: getChangelogUrl("cargo", name),
      };
    });
  } catch {
    throw new Error(
      "cargo-update not installed. Run: cargo install cargo-update",
    );
  }
}

export async function upgradeCargo(): Promise<string> {
  return run("cargo install-update --all", "cargo");
}

// ─── gem ──────────────────────────────────────────────────────────────────────

export async function checkGem(): Promise<OutdatedPackage[]> {
  const raw = await run("gem outdated", "gem");
  if (!raw) return [];
  return raw.split("\n").map((line) => {
    // Format: "name (current < latest)"
    const match = /^(.+?)\s+\((.+?)\s+<\s+(.+?)\)$/.exec(line);
    if (match) {
      return {
        name: match[1],
        current: match[2],
        latest: match[3],
        website: getPackageUrl("gem", match[1]),
        changelog: getChangelogUrl("gem", match[1]),
      };
    }
    return {
      name: line,
      current: "?",
      latest: "?",
      website: getPackageUrl("gem", line),
      changelog: getChangelogUrl("gem", line),
    };
  });
}

export async function upgradeGem(): Promise<string> {
  return run("gem update", "gem");
}

// ─── mas (Mac App Store) ──────────────────────────────────────────────────────

export async function checkMas(): Promise<OutdatedPackage[]> {
  try {
    const accountInfo = await run("mas account", "mas");
    if (!accountInfo || accountInfo.toLowerCase().includes("not signed in")) {
      throw new Error(
        "Mac App Store is not signed in. Please sign in via the App Store app first.",
      );
    }
  } catch (err: any) {
    if (err?.message?.includes("not signed in")) {
      throw err;
    }
    throw new Error(
      "mas not installed or failed to check account. Run: brew install mas",
    );
  }

  try {
    const raw = await run("mas outdated", "mas");
    if (!raw) return [];
    return raw.split("\n").map((line) => {
      const match = /^(\d+)\s+(.+?)\s+\((.+?)\)$/.exec(line);
      if (match) {
        return { name: match[2], current: "installed", latest: match[3] };
      }
      return { name: line, current: "?", latest: "?" };
    });
  } catch {
    throw new Error("mas command execution failed");
  }
}

export async function upgradeMas(): Promise<string> {
  return run("mas upgrade", "mas");
}

// ─── yarn (global) ────────────────────────────────────────────────────────────

export async function checkYarn(): Promise<OutdatedPackage[]> {
  const parseYarn = (out: string): OutdatedPackage[] => {
    if (!out) return [];
    const tableLine = out
      .split("\n")
      .find((line) => line.includes('"type":"table"'));
    if (!tableLine) return [];
    try {
      const json = JSON.parse(tableLine);
      const head: string[] = json.data?.head || [];
      const body: string[][] = json.data?.body || [];

      const nameIdx = head.findIndex((h) => h.toLowerCase() === "package");
      const currentIdx = head.findIndex((h) => h.toLowerCase() === "current");
      const latestIdx = head.findIndex((h) => h.toLowerCase() === "latest");

      if (nameIdx === -1) return [];

      return body.map((row) => {
        const name = row[nameIdx];
        const current = currentIdx !== -1 ? row[currentIdx] : "?";
        const latest = latestIdx !== -1 ? row[latestIdx] : "?";
        return {
          name,
          current,
          latest,
          website: getPackageUrl("npm", name),
          changelog: getChangelogUrl("npm", name),
        };
      });
    } catch {
      return [];
    }
  };

  try {
    const raw = await run("yarn global outdated --json", "yarn");
    return parseYarn(raw);
  } catch (err: any) {
    const stdout = err?.stdout?.trim() ?? "";
    return parseYarn(stdout);
  }
}

export async function upgradeYarn(): Promise<string> {
  return run("yarn global upgrade", "yarn");
}

// ─── pnpm (global) ────────────────────────────────────────────────────────────

export async function checkPnpm(): Promise<OutdatedPackage[]> {
  try {
    const raw = await run("pnpm outdated -g --json", "pnpm");
    if (!raw) return [];
    const json = JSON.parse(raw);
    return Object.entries(json).map(([name, info]: [string, any]) => ({
      name,
      current: info.current ?? "?",
      latest: info.latest ?? "?",
      website: getPackageUrl("npm", name),
      changelog: getChangelogUrl("npm", name),
    }));
  } catch (err: any) {
    const stdout = err?.stdout?.trim() ?? "";
    if (!stdout) return [];
    const json = JSON.parse(stdout);
    return Object.entries(json).map(([name, info]: [string, any]) => ({
      name,
      current: info.current ?? "?",
      latest: info.latest ?? "?",
      website: getPackageUrl("npm", name),
      changelog: getChangelogUrl("npm", name),
    }));
  }
}

export async function upgradePnpm(): Promise<string> {
  return run("pnpm update -g", "pnpm");
}

// ─── go (global tools) ────────────────────────────────────────────────────────

// Maximum number of Go binaries to inspect (prevents extreme slowdowns)
const GO_BINARY_SCAN_LIMIT = 30;
// Timeout per binary version lookup (seconds)
const GO_VERSION_TIMEOUT_MS = 8_000;

export async function checkGo(): Promise<OutdatedPackage[]> {
  try {
    const gopathRaw = await run("go env GOPATH 2>/dev/null || true", "go");
    const gopath = gopathRaw.trim() || `${homedir()}/go`;
    const binDir = `${gopath}/bin`;

    const rawFiles = await run(
      `ls -1 ${quoteShellArg(binDir)} 2>/dev/null || true`,
      "go",
    );
    const files = rawFiles.split("\n").filter(Boolean);
    if (files.length === 0) return [];

    // Cap scan to prevent extreme slowdowns on large GOPATH/bin dirs
    const filesToScan = files.slice(0, GO_BINARY_SCAN_LIMIT);
    const outdated: OutdatedPackage[] = [];

    for (const file of filesToScan) {
      try {
        const binPath = `${binDir}/${file}`;
        const versionRaw = await withTimeout(
          run(
            `go version -m ${quoteShellArg(binPath)} 2>/dev/null || true`,
            "go",
          ),
          GO_VERSION_TIMEOUT_MS,
          `go version -m ${file}`,
        );
        const pathMatch = versionRaw.match(/^\s*path\s+([^\s]+)/m);
        const modMatch = versionRaw.match(/^\s*mod\s+[^\s]+\s+([^\s]+)/m);

        if (pathMatch && modMatch) {
          const modPath = pathMatch[1];
          const current = modMatch[1];

          if (current === "(devel)") continue;

          const latestRaw = await withTimeout(
            run(
              `GO111MODULE=on go list -m -json ${quoteShellArg(`${modPath}@latest`)} 2>/dev/null || true`,
              "go",
            ),
            GO_VERSION_TIMEOUT_MS,
            `go list ${modPath}@latest`,
          );
          if (latestRaw) {
            try {
              const latestJson = JSON.parse(latestRaw);
              const latest = latestJson.Version;

              if (latest && current !== latest) {
                outdated.push({
                  name: modPath,
                  current,
                  latest,
                  website: getPackageUrl("go", modPath),
                  changelog: getChangelogUrl("go", modPath),
                });
              }
            } catch {
              continue;
            }
          }
        }
      } catch {
        // Timeout or version parse failure — skip this binary
        continue;
      }
    }

    return outdated;
  } catch {
    throw new Error("go not installed. Run: brew install go");
  }
}

export async function upgradeGo(): Promise<string> {
  const outdated = await checkGo();
  if (outdated.length === 0) return "All Go tools are up to date.";
  const updates = outdated.map((pkg) => `${pkg.name}@latest`).join(" ");
  return run(
    `go install ${updates.split(" ").map(quoteShellArg).join(" ")}`,
    "go",
  );
}

// ─── bun (global) ─────────────────────────────────────────────────────────────

export async function checkBun(): Promise<OutdatedPackage[]> {
  try {
    const raw = await run("bun outdated -g", "bun");
    if (!raw) return [];
    return raw
      .split("\n")
      .filter((l) => l.includes("@"))
      .map((l) => {
        const parts = l.split(/\s+/);
        const name = parts[0];
        return {
          name,
          current: parts[1] ?? "?",
          latest: parts[2] ?? "?",
          website: getPackageUrl("bun", name),
          changelog: getChangelogUrl("bun", name),
        };
      });
  } catch {
    return [];
  }
}

export async function upgradeBun(): Promise<string> {
  return run("bun update -g", "bun");
}

// ─── deno ─────────────────────────────────────────────────────────────────────
// Deno doesn't expose a global "outdated" command.
// We return an informational entry so the UI can show a note.
export async function checkDeno(): Promise<OutdatedPackage[]> {
  try {
    // Get deno version to confirm it's installed; no real outdated check available
    await run("deno --version", "deno");
    // Return empty — deno runtime is upgraded via `deno upgrade` which has no package list
    return [];
  } catch {
    return [];
  }
}

export async function upgradeDeno(): Promise<string> {
  return run("deno upgrade", "deno");
}

// ─── composer (global) ────────────────────────────────────────────────────────

export async function checkComposer(): Promise<OutdatedPackage[]> {
  try {
    const raw = await run("composer global outdated --format=json", "composer");
    if (!raw) return [];
    const json = JSON.parse(raw);
    return (json.installed || []).map((p: any) => ({
      name: p.name,
      current: p.version,
      latest: p.latest || "?",
      website: getPackageUrl("composer", p.name),
      changelog: getChangelogUrl("composer", p.name),
    }));
  } catch {
    return [];
  }
}

export async function upgradeComposer(): Promise<string> {
  return run("composer global update", "composer");
}

export async function installPackage(
  ecosystem: EcosystemId,
  packageName: string,
  options?: {
    userInstall?: boolean;
    globalInstall?: boolean;
    version?: string;
  },
): Promise<string> {
  const version = options?.version?.trim();
  const nameArg = quoteShellArg(packageName);
  switch (ecosystem) {
    case "brew":
      return run(`brew install ${nameArg}`, "brew");
    case "npm": {
      const pkgTarget = version ? `${packageName}@${version}` : packageName;
      return run(
        `npm install ${options?.globalInstall !== false ? "-g " : ""}${quoteShellArg(pkgTarget)}`,
        "npm",
      );
    }
    case "yarn": {
      const pkgTarget = version ? `${packageName}@${version}` : packageName;
      return run(
        `yarn ${options?.globalInstall !== false ? "global " : ""}add ${quoteShellArg(pkgTarget)}`,
        "yarn",
      );
    }
    case "pnpm": {
      const pkgTarget = version ? `${packageName}@${version}` : packageName;
      return run(
        `pnpm add ${options?.globalInstall !== false ? "-g " : ""}${quoteShellArg(pkgTarget)}`,
        "pnpm",
      );
    }
    case "pip": {
      const pipCmd = await resolvePipCmd();
      const pkgTarget = version ? `${packageName}==${version}` : packageName;
      return run(
        `${pipCmd} install ${options?.userInstall ? "--user " : ""}${quoteShellArg(pkgTarget)}`,
        "pip",
      );
    }
    case "pipx": {
      const pkgTarget = version ? `${packageName}==${version}` : packageName;
      return run(`pipx install ${quoteShellArg(pkgTarget)}`, "pipx");
    }
    case "gem": {
      const extraArgs = version ? ` -v ${quoteShellArg(version)}` : "";
      return run(`gem install ${nameArg}${extraArgs}`, "gem");
    }
    case "cargo": {
      const extraArgs = version ? ` --version ${quoteShellArg(version)}` : "";
      return run(`cargo install ${nameArg}${extraArgs}`, "cargo");
    }
    case "go": {
      const verSuffix = version
        ? version.startsWith("v")
          ? version
          : `v${version}`
        : "latest";
      return run(
        `go install ${quoteShellArg(`${packageName}@${verSuffix}`)}`,
        "go",
      );
    }
    case "bun": {
      const pkgTarget = version ? `${packageName}@${version}` : packageName;
      return run(`bun install -g ${quoteShellArg(pkgTarget)}`, "bun");
    }
    case "deno": {
      const pkgTarget = version ? `${packageName}@${version}` : packageName;
      return run(`deno install -g ${quoteShellArg(pkgTarget)}`, "deno");
    }
    case "composer": {
      const pkgTarget = version ? `${packageName}:${version}` : packageName;
      return run(
        `composer global require ${quoteShellArg(pkgTarget)}`,
        "composer",
      );
    }
    default:
      throw new Error(`Install not supported for: ${ecosystem}`);
  }
}

export async function listInstalledPackages(
  ecosystem: EcosystemId,
): Promise<OutdatedPackage[]> {
  switch (ecosystem) {
    case "brew": {
      const formulaRaw = await run(
        "brew list --formula --versions 2>/dev/null",
        "brew",
      );
      const caskRaw = await run(
        "brew list --cask --versions 2>/dev/null",
        "brew",
      );
      const lines = (formulaRaw + "\n" + caskRaw).split("\n").filter(Boolean);
      return lines.map((line) => {
        const parts = line.trim().split(/\s+/);
        const name = parts[0];
        const current = parts.slice(1).join(" ") || "?";
        return {
          name,
          current,
          latest: "?",
          website: getPackageUrl("brew", name),
        };
      });
    }
    case "npm":
    case "pnpm":
    case "yarn": {
      try {
        const cmd =
          ecosystem === "npm"
            ? "npm ls -g --depth=0 --json"
            : `${ecosystem} ls -g --depth=0 --json`;
        const raw = await run(cmd, ecosystem);
        if (!raw) return [];
        const json = JSON.parse(raw);
        const deps = json.dependencies ?? {};
        return Object.entries(deps).map(([name, info]: [string, any]) => ({
          name,
          current: info.version ?? "?",
          latest: "?",
          website: getPackageUrl("npm", name),
        }));
      } catch {
        return [];
      }
    }
    case "pip": {
      try {
        const pipCmd = await resolvePipCmd();
        const raw = await run(`${pipCmd} list --format=json`, "pip");
        if (!raw) return [];
        const json: Array<{ name: string; version: string }> = JSON.parse(raw);
        return json.map((p) => ({
          name: p.name,
          current: p.version,
          latest: "?",
          website: getPackageUrl("pip", p.name),
        }));
      } catch {
        return [];
      }
    }
    case "pipx": {
      try {
        const raw = await run("pipx list --json", "pipx");
        const json = JSON.parse(raw);
        const venvs: Record<string, any> = json?.venvs ?? {};
        return Object.entries(venvs).map(([name, info]: [string, any]) => ({
          name,
          current: info?.metadata?.main_package?.package_version ?? "?",
          latest: "?",
          website: getPackageUrl("pip", name),
        }));
      } catch {
        return [];
      }
    }
    case "gem": {
      try {
        const raw = await run("gem list --local", "gem");
        if (!raw) return [];
        return raw
          .split("\n")
          .filter(Boolean)
          .map((line) => {
            const m = /^(.+?) \((.+?)\)/.exec(line);
            const name = m ? m[1] : line;
            const current = m ? m[2] : "?";
            return {
              name,
              current,
              latest: "?",
              website: getPackageUrl("gem", name),
            };
          });
      } catch {
        return [];
      }
    }
    case "cargo": {
      try {
        const raw = await run("cargo install --list 2>/dev/null", "cargo");
        if (!raw) return [];
        const lines = raw.split("\n");
        const pkgs: OutdatedPackage[] = [];
        for (const line of lines) {
          const m = /^(.+?) v([0-9.-]+):/.exec(line);
          if (m) {
            pkgs.push({
              name: m[1],
              current: m[2],
              latest: "?",
              website: getPackageUrl("cargo", m[1]),
            });
          }
        }
        return pkgs;
      } catch {
        return [];
      }
    }
    case "go": {
      try {
        const gopath = await run("go env GOPATH 2>/dev/null", "go");
        const binDir = gopath ? `${gopath}/bin` : "$(go env GOPATH)/bin";
        const raw = await run(
          `ls -1 ${quoteShellArg(binDir)} 2>/dev/null || true`,
          "go",
        );
        if (!raw) return [];
        return raw
          .split("\n")
          .filter(Boolean)
          .map((n) => ({
            name: n,
            current: "?",
            latest: "?",
            website: getPackageUrl("go", n),
          }));
      } catch {
        return [];
      }
    }
    case "bun": {
      try {
        const raw = await run("bun pm ls -g", "bun");
        if (!raw) return [];
        return raw
          .split("\n")
          .filter((l) => l.includes("@"))
          .map((l) => {
            const m = l.match(/([^@\s]+)@([^\s]+)/);
            return m
              ? {
                  name: m[1],
                  current: m[2],
                  latest: "?",
                  website: getPackageUrl("bun", m[1]),
                }
              : null;
          })
          .filter(Boolean) as OutdatedPackage[];
      } catch {
        return [];
      }
    }
    case "deno": {
      try {
        const raw = await run(
          'ls -1 $(deno info --json | grep -o \'"install": "[^"]*\' | cut -d \'"\' -f 4)/bin 2>/dev/null || true',
          "deno",
        );
        return raw
          .split("\n")
          .filter(Boolean)
          .map((n) => ({
            name: n,
            current: "?",
            latest: "?",
            website: getPackageUrl("deno", n),
          }));
      } catch {
        return [];
      }
    }
    case "composer": {
      try {
        const raw = await run(
          "composer global show --format=json 2>/dev/null",
          "composer",
        );
        const json = JSON.parse(raw);
        return (json.installed || []).map((p: any) => ({
          name: p.name,
          current: p.version,
          latest: "?",
          website: getPackageUrl("composer", p.name),
        }));
      } catch {
        return [];
      }
    }
    case "mas":
    default:
      return [];
  }
}

export async function uninstallPackage(
  ecosystem: EcosystemId,
  packageName: string,
): Promise<string> {
  const nameArg = quoteShellArg(packageName);
  switch (ecosystem) {
    case "brew":
      return run(`brew uninstall ${nameArg}`, "brew");
    case "npm":
      return run(`npm uninstall -g ${nameArg}`, "npm");
    case "yarn":
      return run(`yarn global remove ${nameArg}`, "yarn");
    case "pnpm":
      return run(`pnpm remove -g ${nameArg}`, "pnpm");
    case "pip": {
      const pipCmd = await resolvePipCmd();
      return run(`${pipCmd} uninstall -y ${nameArg}`, "pip");
    }
    case "pipx":
      return run(`pipx uninstall ${nameArg}`, "pipx");
    case "gem":
      return run(`gem uninstall ${nameArg}`, "gem");
    case "cargo":
      return run(`cargo uninstall ${nameArg}`, "cargo");
    case "go":
      return run(`rm $(go env GOPATH)/bin/${nameArg} || true`, "go");
    case "mas":
      return run(`mas uninstall ${nameArg}`, "mas");
    case "bun":
      return run(`bun remove -g ${nameArg}`, "bun");
    case "deno":
      return run(
        `rm $(deno info --json | grep -o '"install": "[^"]*"' | cut -d '"' -f 4)/bin/${nameArg} || true`,
        "deno",
      );
    case "composer":
      return run(`composer global remove ${nameArg}`, "composer");
    default:
      throw new Error(`Uninstall not supported for: ${ecosystem}`);
  }
}

export async function cleanupEcosystem(
  ecosystem: EcosystemId,
): Promise<string> {
  switch (ecosystem) {
    case "brew":
      return run("brew cleanup", "brew");
    case "npm":
      return run("npm cache clean --force", "npm");
    case "yarn":
      return run("yarn cache clean", "yarn");
    case "pnpm":
      return run("pnpm store prune", "pnpm");
    case "pip": {
      const pipCmd = await resolvePipCmd();
      return run(`${pipCmd} cache purge`, "pip");
    }
    case "gem":
      return run("gem cleanup", "gem");
    case "go":
      return run("go clean -modcache", "go");
    case "bun":
      return run("bun pm cache rm", "bun");
    case "composer":
      return run("composer clear-cache", "composer");
    case "cargo":
    case "pipx":
    case "deno":
    case "mas":
      return "No cleanup command available or necessary for this ecosystem.";
    default:
      throw new Error(`Cleanup not supported for: ${ecosystem}`);
  }
}

export interface FnmVersion {
  version: string;
  isDefault: boolean;
  isActive: boolean;
}

export async function checkFnmVersions(): Promise<FnmVersion[]> {
  try {
    const raw = await run("fnm list");
    const versions: FnmVersion[] = [];
    const lines = raw.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // Line format example: "* v24.18.0 default, lts-latest" or "v24.18.0"
      const isActive = trimmed.startsWith("*");
      const cleanLine = trimmed.replace(/^\*\s*/, "").trim();
      if (cleanLine.toLowerCase() === "system") {
        versions.push({
          version: "system",
          isDefault: false,
          isActive,
        });
        continue;
      }
      const parts = cleanLine.split(/\s+/);
      const versionStr = parts[0] ?? "";
      if (versionStr.startsWith("v") || /^[0-9]/.test(versionStr)) {
        const isDefault = cleanLine.includes("default");
        versions.push({
          version: versionStr,
          isDefault,
          isActive,
        });
      }
    }
    return versions;
  } catch {
    return [];
  }
}

export interface JavaJDK {
  version: string;
  arch: string;
  vendor: string;
  name: string;
  path: string;
}

export async function checkJavaJDKs(): Promise<JavaJDK[]> {
  try {
    const raw = await run("/usr/libexec/java_home -V 2>&1 || true");
    const jdks: JavaJDK[] = [];
    const lines = raw.split("\n");
    const regex =
      /^\s*([^\s(]+)\s*\(([^)]+)\)\s*"([^"]+)"\s*-\s*"([^"]+)"\s+(.+)$/;
    for (const line of lines) {
      const match = regex.exec(line);
      if (match) {
        jdks.push({
          version: match[1],
          arch: match[2],
          vendor: match[3],
          name: match[4],
          path: match[5],
        });
      }
    }
    return jdks;
  } catch {
    return [];
  }
}

export interface LocalProject {
  name: string;
  path: string;
  type: "node" | "rust";
  packages: OutdatedPackage[];
}

export async function checkLocalProjects(): Promise<LocalProject[]> {
  const projects: LocalProject[] = [];
  const cwd = process.cwd();

  // 1. Node.js check
  if (existsSync(join(cwd, "package.json"))) {
    try {
      const raw = await run("npm list --depth=0 --json");
      if (raw) {
        const json = JSON.parse(raw);
        const name = json.name ?? "Current Project";
        const deps = json.dependencies ?? {};
        const packages: OutdatedPackage[] = Object.entries(deps).map(
          ([pkgName, info]: [string, any]) => ({
            name: pkgName,
            current: info.version ?? "?",
            latest: "?",
            website: getPackageUrl("npm", pkgName),
          }),
        );
        projects.push({
          name,
          path: cwd,
          type: "node",
          packages,
        });
      }
    } catch {
      // Fallback manual parse if npm list fails
      try {
        const pkgContent = readFileSync(join(cwd, "package.json"), "utf8");
        const pkgJson = JSON.parse(pkgContent);
        const name = pkgJson.name ?? "Current Project";
        const allDeps = {
          ...(pkgJson.dependencies ?? {}),
          ...(pkgJson.devDependencies ?? {}),
        };
        const packages: OutdatedPackage[] = Object.entries(allDeps).map(
          ([pkgName, ver]: [string, any]) => {
            let installedVer = ver;
            try {
              const nodeModulePkg = readFileSync(
                join(cwd, "node_modules", pkgName, "package.json"),
                "utf8",
              );
              const nodeModuleJson = JSON.parse(nodeModulePkg);
              installedVer = nodeModuleJson.version ?? ver;
            } catch {
              // ignore
            }
            return {
              name: pkgName,
              current: String(installedVer),
              latest: "?",
              website: getPackageUrl("npm", pkgName),
            };
          },
        );
        projects.push({
          name,
          path: cwd,
          type: "node",
          packages,
        });
      } catch {
        // ignore
      }
    }
  }

  // 2. Rust check (Cargo.toml)
  if (projects.length === 0 && existsSync(join(cwd, "Cargo.toml"))) {
    try {
      const cargoContent = readFileSync(join(cwd, "Cargo.toml"), "utf8");
      const nameMatch = /^name\s*=\s*"([^"]+)"/m.exec(cargoContent);
      const name = nameMatch ? nameMatch[1] : "Rust Project";

      const rawMetadata = await run(
        "cargo metadata --format-version 1 --no-deps",
      );
      if (rawMetadata) {
        const json = JSON.parse(rawMetadata);
        const packages: OutdatedPackage[] = (json.packages ?? []).flatMap(
          (pkg: any) =>
            (pkg.dependencies ?? []).map((dep: any) => ({
              name: dep.name,
              current: dep.req ?? "?",
              latest: "?",
              website: getPackageUrl("cargo", dep.name),
            })),
        );
        projects.push({
          name,
          path: cwd,
          type: "rust",
          packages,
        });
      }
    } catch {
      // ignore
    }
  }

  return projects;
}
