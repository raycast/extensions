import { accessSync, constants } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ExecFileOptions } from "node:child_process";
import { deriveToolUrl, MiseCommandError } from "./utils";
import type {
  MiseBackend,
  MiseDoctorResult,
  MiseInstalledTool,
  MiseOutdatedTool,
  MisePlugin,
  MiseRegistryEntry,
  MiseSetting,
  MiseToolVersion,
} from "./types";

// Re-export types and utils so consumers don't break
export * from "./types";
export * from "./utils";

const execFileAsync = promisify(execFile);

const PATH_SEPARATOR = process.platform === "win32" ? ";" : ":";
const EXECUTABLE_EXTENSIONS = process.platform === "win32" ? [".exe", ".cmd", ".bat", ""] : [""];

let cachedBinaryPath: string | null = null;

type RunMiseOptions = ExecFileOptions & {
  allowNonZeroExit?: boolean;
};

function findBinary(candidate: string): string | undefined {
  const expanded = candidate.startsWith("~/") ? join(homedir(), candidate.slice(2)) : candidate;
  try {
    accessSync(expanded, constants.X_OK);
    return expanded;
  } catch {
    if (process.platform === "win32") {
      try {
        accessSync(expanded);
        return expanded;
      } catch {
        // fall through
      }
    }
    return undefined;
  }
}

function findBinaryInPath(binary: string): string | undefined {
  const pathEnv = process.env.PATH ?? "";
  for (const directory of pathEnv.split(PATH_SEPARATOR)) {
    if (!directory) continue;
    for (const ext of EXECUTABLE_EXTENSIONS) {
      const candidate = join(directory, `${binary}${ext}`);
      const found = findBinary(candidate);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

function resolveMiseBinary(): string {
  if (cachedBinaryPath) {
    return cachedBinaryPath;
  }

  const candidates = new Set<string>();
  if (process.env.MISE_BIN) {
    candidates.add(process.env.MISE_BIN);
  }
  candidates.add("mise");
  candidates.add("~/Library/Application Support/mise/bin/mise");
  candidates.add(join(homedir(), ".local", "bin", "mise"));
  candidates.add("/opt/homebrew/bin/mise");
  candidates.add("/usr/local/bin/mise");
  candidates.add("/usr/bin/mise");

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (candidate.includes("/") || candidate.includes("\\")) {
      const binary = findBinary(candidate);
      if (binary) {
        cachedBinaryPath = binary;
        return binary;
      }
    } else {
      const binary = findBinaryInPath(candidate);
      if (binary) {
        cachedBinaryPath = binary;
        return binary;
      }
    }
  }

  throw new Error("Unable to locate the mise binary. Set MISE_BIN or ensure mise is on PATH.");
}

export function getMiseBinary(): string {
  return resolveMiseBinary();
}

export async function runMise(args: string[], options: RunMiseOptions = {}) {
  const binary = getMiseBinary();
  const { allowNonZeroExit, ...execOptions } = options;

  const extraPaths = [
    "/opt/homebrew/bin",
    "/opt/homebrew/sbin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
  ];
  const newPath = extraPaths.join(PATH_SEPARATOR) + PATH_SEPARATOR + (process.env.PATH ?? "");

  const env = {
    ...process.env,
    CI: process.env.CI ?? "1",
    MISE_SKIP_VERSION_CHECK: process.env.MISE_SKIP_VERSION_CHECK ?? "1",
    MISE_YES: "1",
    MISE_NO_COLOR: "1",
    PATH: newPath,
    SHELL: process.env.SHELL || "/bin/bash",
    ...execOptions.env,
  };

  try {
    const { stdout, stderr } = await execFileAsync(binary, args, {
      maxBuffer: 1024 * 1024 * 20,
      ...execOptions,
      env,
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (caught) {
    const error = caught as NodeJS.ErrnoException & { stdout?: string; stderr?: string; code?: number | string };
    const stdout = error.stdout ?? "";
    const stderr = error.stderr ?? "";
    if (allowNonZeroExit) {
      return { stdout, stderr, exitCode: error.code ?? null };
    }
    throw new MiseCommandError(`mise ${args.join(" ")}`, args, stdout, stderr, error.code ?? null, caught);
  }
}

export async function listInstalledTools(): Promise<MiseInstalledTool[]> {
  const { stdout } = await runMise(["ls", "--json"]);
  const trimmed = stdout.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const parsed = JSON.parse(trimmed) as Record<string, unknown>;
  const tools: MiseInstalledTool[] = [];
  for (const [name, payload] of Object.entries(parsed)) {
    if (!Array.isArray(payload)) continue;
    const versions: MiseToolVersion[] = payload
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return undefined;
        }
        const data = entry as Record<string, unknown>;
        return {
          version: String(data.version ?? ""),
          requestedVersion: typeof data.requested_version === "string" ? data.requested_version : undefined,
          installPath: typeof data.install_path === "string" ? data.install_path : undefined,
          sourcePath:
            data.source &&
            typeof data.source === "object" &&
            typeof (data.source as Record<string, unknown>).path === "string"
              ? String((data.source as Record<string, unknown>).path)
              : undefined,
          isActive: Boolean(data.active),
          isInstalled: "installed" in data ? Boolean(data.installed) : true,
        } satisfies MiseToolVersion;
      })
      .filter(Boolean) as MiseToolVersion[];

    versions.sort((a, b) => {
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1;
      }
      return a.version.localeCompare(b.version, undefined, { numeric: true });
    });

    tools.push({
      name,
      versions,
    });
  }

  tools.sort((a, b) => a.name.localeCompare(b.name));
  return tools;
}

export async function listOutdatedTools(): Promise<MiseOutdatedTool[]> {
  const { stdout } = await runMise(["outdated", "--json"]);
  const trimmed = stdout.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const parsed = JSON.parse(trimmed) as unknown;
  const rawEntries: Record<string, unknown>[] = [];

  if (Array.isArray(parsed)) {
    for (const entry of parsed) {
      if (entry && typeof entry === "object") {
        rawEntries.push(entry as Record<string, unknown>);
      }
    }
  } else if (parsed && typeof parsed === "object") {
    const data = parsed as Record<string, unknown>;
    if (Array.isArray(data.tools)) {
      for (const entry of data.tools) {
        if (entry && typeof entry === "object") {
          rawEntries.push(entry as Record<string, unknown>);
        }
      }
    } else {
      for (const [name, entry] of Object.entries(data)) {
        if (entry && typeof entry === "object") {
          rawEntries.push({ name, ...(entry as Record<string, unknown>) });
        }
      }
    }
  }

  return rawEntries
    .map((entry) => {
      const name =
        (typeof entry.tool === "string" && entry.tool) ||
        (typeof entry.name === "string" && entry.name) ||
        (typeof entry.plugin === "string" && entry.plugin) ||
        "";
      if (!name) return undefined;

      const currentVersion =
        (typeof entry.current_version === "string" && entry.current_version) ||
        (typeof entry.current === "string" && entry.current) ||
        (typeof entry.installed === "string" && entry.installed) ||
        "";
      const latestVersion =
        (typeof entry.latest_version === "string" && entry.latest_version) ||
        (typeof entry.latest === "string" && entry.latest) ||
        (typeof entry.available === "string" && entry.available) ||
        "";

      const requestedVersion =
        (typeof entry.requested_version === "string" && entry.requested_version) ||
        (typeof entry.requested === "string" && entry.requested) ||
        (typeof entry.wanted === "string" && entry.wanted) ||
        undefined;

      const sourcePath =
        entry.source &&
        typeof entry.source === "object" &&
        typeof (entry.source as Record<string, unknown>).path === "string"
          ? String((entry.source as Record<string, unknown>).path)
          : undefined;

      const installPath = typeof entry.install_path === "string" ? entry.install_path : undefined;

      return {
        name,
        currentVersion,
        latestVersion,
        requestedVersion,
        sourcePath,
        installPath,
      } satisfies MiseOutdatedTool;
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name)) as MiseOutdatedTool[];
}

export async function searchMiseRegistry(query: string): Promise<MiseRegistryEntry[]> {
  if (!query.trim()) {
    return [];
  }

  let stdout = "";
  try {
    const result = await runMise(["search", query]);
    stdout = result.stdout;
  } catch (error) {
    if (error instanceof MiseCommandError && error.exitCode === 1) {
      return [];
    }
    throw error;
  }

  const lines = stdout.split("\n").map((line) => line.trim());
  const seen = new Set<string>();
  const entries: MiseRegistryEntry[] = [];
  for (const line of lines) {
    if (!line) continue;
    const [name, ...rest] = line.split(/\s+/);
    if (entries.length === 0 && (name.toLowerCase() === "name" || name.toLowerCase() === "tool")) {
      continue;
    }
    if (seen.has(name)) continue;
    seen.add(name);
    entries.push({
      name,
      description: rest.join(" ").trim() || undefined,
    });
  }
  return entries;
}

export async function listRegistryEntries(): Promise<MiseRegistryEntry[]> {
  const { stdout } = await runMise(["registry", "--json"]);
  const entries: MiseRegistryEntry[] = [];
  const parsed = JSON.parse(stdout);

  if (Array.isArray(parsed)) {
    for (const entry of parsed) {
      const name = entry.short || entry.name;
      const backends = entry.backends || [];
      entries.push({
        name,
        description: entry.description,
        backends,
        url: deriveToolUrl(backends),
        identifier: backends[0],
      });
    }
  }
  return entries;
}

export async function listInstalledPlugins(): Promise<MisePlugin[]> {
  const { stdout } = await runMise(["plugins", "ls", "--urls"]);
  const plugins: MisePlugin[] = [];
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [name, ...rest] = trimmed.split(/\s+/);
    plugins.push({
      name,
      url: rest.join(" ").trim() || undefined,
    });
  }
  return plugins;
}

export async function installPlugin(name: string, url?: string) {
  const args = ["plugins", "install", name];
  if (url && url.trim().length > 0) {
    args.push(url.trim());
  }
  await runMise(args);
}

export async function uninstallPlugin(name: string) {
  await runMise(["plugins", "uninstall", name]);
}

export async function listBackends(): Promise<MiseBackend[]> {
  const { stdout } = await runMise(["backends", "ls"]);
  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

interface InstallToolOptions {
  version?: string;
  backend?: string;
  activate?: "none" | "local" | "global";
  pin?: boolean;
  force?: boolean;
}

export async function installTool(name: string, options: InstallToolOptions = {}) {
  const spec = buildToolSpec(name, options.version, options.backend);
  if (options.activate && options.activate !== "none") {
    const args = ["use"];
    if (options.activate === "global") {
      args.push("--global");
    }
    if (options.pin) {
      args.push("--pin");
    }
    if (options.force) {
      args.push("--force");
    }
    args.push(spec);
    await runMise(args);
    return;
  }

  const args = ["install"];
  if (options.force) {
    args.push("--force");
  }
  args.push(spec);
  await runMise(args);
}

function buildToolSpec(name: string, version?: string, backend?: string) {
  const trimmedName = name.trim();
  if (backend && backend.trim().length > 0 && !trimmedName.includes(":")) {
    const backendName = backend.trim().replace(/:$/, "");
    return version ? `${backendName}:${trimmedName}@${version}` : `${backendName}:${trimmedName}`;
  }
  if (version && version.trim().length > 0 && !trimmedName.includes("@")) {
    return `${trimmedName}@${version.trim()}`;
  }
  return trimmedName;
}

export async function runPrune(options: { dryRun?: boolean } = {}) {
  const args = ["prune", "--yes"];
  if (options.dryRun) {
    args.push("--dry-run");
  }
  return runMise(args);
}

export async function getCachePath(): Promise<string> {
  const { stdout } = await runMise(["cache", "path"]);
  return stdout.trim();
}

export async function runDoctor(): Promise<MiseDoctorResult> {
  const { stdout } = await runMise(["doctor", "--json"]);
  return JSON.parse(stdout) as MiseDoctorResult;
}

export async function listSettings(): Promise<MiseSetting[]> {
  const { stdout } = await runMise(["settings"]);
  const settings: MiseSetting[] = [];
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [key, value, ...rest] = trimmed.split(/\s+/);
    settings.push({
      key,
      value,
      source: rest.join(" ").trim() || undefined,
    });
  }
  return settings;
}

export async function updateSetting(key: string, value: string) {
  await runMise(["settings", `${key}=${value}`]);
}

export async function upgradeTool(name: string) {
  await runMise(["upgrade", name]);
}

export async function updateMise() {
  const binary = getMiseBinary();

  const isLikelyHomebrew =
    (process.platform === "darwin" || process.platform === "linux") &&
    (binary.includes("/Cellar/") ||
      binary.includes("/opt/homebrew/") ||
      binary.includes("/usr/local/Cellar") ||
      binary.includes("/home/linuxbrew/"));

  if (isLikelyHomebrew) {
    const extraPaths = [
      "/opt/homebrew/bin",
      "/opt/homebrew/sbin",
      "/usr/local/bin",
      "/usr/bin",
      "/bin",
      "/usr/sbin",
      "/sbin",
    ];
    const newPath = extraPaths.join(PATH_SEPARATOR) + PATH_SEPARATOR + (process.env.PATH ?? "");
    const env = { ...process.env, PATH: newPath };

    try {
      // We assume 'brew' is in one of these paths
      await execFileAsync("brew", ["list", "mise"], { env });
      await execFileAsync("brew", ["upgrade", "mise"], { env });
      return;
    } catch {
      // fallthrough
    }
  }

  await runMise(["self-update", "--yes"]);
}

export async function listAllVersions(name: string): Promise<string[]> {
  const { stdout } = await runMise(["ls-remote", name]);
  return (
    stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      // Reverse to show latest versions first
      .reverse()
  );
}

export async function uninstallToolVersion(name: string, version: string) {
  await runMise(["uninstall", `${name}@${version}`]);
}

export async function setToolVersion(name: string, version: string, options: { global?: boolean; path?: string } = {}) {
  const args = [];
  if (options.path) {
    args.push("-C", options.path);
  }
  args.push("use");
  if (options.global) {
    args.push("--global");
  }
  args.push(`${name}@${version}`);
  await runMise(args);
}

export async function unuseTool(name: string, options: { path?: string } = {}) {
  const args = ["use", "--remove", name];
  if (options.path) {
    args.push("--path", options.path);
  }
  await runMise(args);
}

export async function listTasks(): Promise<MiseTask[]> {
  const { stdout } = await runMise(["tasks", "ls", "--json"]);
  const trimmed = stdout.trim();
  if (trimmed.length === 0) return [];
  return JSON.parse(trimmed) as MiseTask[];
}

export function getTaskRunCommand(taskName: string): string {
  return `mise run ${taskName}`;
}

export async function reshim() {
  await runMise(["reshim"]);
}

export async function cleanCache() {
  await runMise(["cache", "clean"]);
}

export async function updatePlugins() {
  await runMise(["plugins", "update"]);
}
