import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { logger } from "@chrismessina/raycast-logger";
import { environment, getPreferenceValues } from "@raycast/api";
import { DEMO_LATENCY_MS, demoStdout, isDemo } from "./demo";
import { classifyCliError, compareVersions, ErrorKind, MIN_CLI_VERSION, parseCliVersion, subcommand } from "./parse";

export const IS_WINDOWS = process.platform === "win32";
export const IS_MAC = process.platform === "darwin";
export const CLI_PACKAGE = "@dayone/cli";
export const INSTALL_COMMAND = `npm install -g ${CLI_PACKAGE}`;
export const CLI_DOCS_URL = "https://github.com/Automattic/DayOne-Cli";

const BINARY_NAME = IS_WINDOWS ? "dayone.exe" : "dayone";
const PLATFORM_PACKAGE = `cli-${process.platform}-${process.arch}`;

const log = logger.child("[cli]");

/**
 * The CLI's embedding library caches its ~90 MB search model in `./.fastembed_cache`, relative to the working
 * directory. Raycast runs commands from `/`, which is read-only, so every search failed. Give it a fixed,
 * writable home instead (and use that as the working directory, so nothing else lands in `/` either).
 */
function modelCacheDir(): string {
  return join(environment.supportPath, "search-model");
}

export function cliSpawnOptions() {
  mkdirSync(modelCacheDir(), { recursive: true });
  return {
    cwd: environment.supportPath,
    env: { ...process.env, FASTEMBED_CACHE_DIR: modelCacheDir() },
    windowsHide: true,
  };
}

/**
 * The CLI's Windows build leaves out the search model (its ONNX runtime needs the VC++ runtime), so there search
 * quietly matches words only: no model to download, no index to rebuild. See DayOne-Cli's build-binaries.yml.
 */
export const SEARCHES_BY_MEANING = !IS_WINDOWS;

/** True once the search model's weights are on disk, or where the CLI has no model to download. */
let modelFound = false;

export function isSearchModelDownloaded(): boolean {
  if (!SEARCHES_BY_MEANING || isDemo() || modelFound) return true;
  const find = (dir: string, depth: number): boolean =>
    listDir(dir).some((name) => name === "model.onnx" || (depth > 0 && find(join(dir, name), depth - 1)));
  // Remembered once true: the weights don't go away, and Doctor asks every second.
  modelFound = find(modelCacheDir(), 4);
  return modelFound;
}

export type CliErrorKind = ErrorKind | "not-installed" | "outdated";

export class DayOneCliError extends Error {
  readonly kind: CliErrorKind;
  constructor(message: string, kind?: DayOneCliError["kind"]) {
    super(message);
    this.name = "DayOneCliError";
    this.kind = kind ?? classifyCliError(message);
  }
}

export type CliInfo = { path: string; version: string; outdated: boolean };

/** Folders where `npm install -g` puts packages, for the Node installs people commonly use. Raycast doesn't load nvm, so PATH can't be trusted. */
function globalNodeModulesDirs(): string[] {
  const home = homedir();
  const dirs: string[] = [];
  if (IS_WINDOWS) {
    const appData = process.env.APPDATA ?? join(home, "AppData", "Roaming");
    dirs.push(join(appData, "npm", "node_modules"));
    if (process.env.NVM_SYMLINK) dirs.push(join(process.env.NVM_SYMLINK, "node_modules"));
    if (process.env.ProgramFiles) dirs.push(join(process.env.ProgramFiles, "nodejs", "node_modules"));
    return dirs;
  }
  const nvmVersions = join(process.env.NVM_DIR ?? join(home, ".nvm"), "versions", "node");
  // Newest Node first, so a fresh install beats a stale one left in an old version.
  for (const version of listDir(nvmVersions).sort(compareNodeDirs))
    dirs.push(join(nvmVersions, version, "lib", "node_modules"));
  dirs.push("/opt/homebrew/lib/node_modules", "/usr/local/lib/node_modules");
  dirs.push(join(home, ".npm-global", "lib", "node_modules"));
  dirs.push(join(home, ".volta", "tools", "image", "packages", CLI_PACKAGE, "lib", "node_modules"));
  for (const base of [
    join(home, ".local", "share", "fnm", "node-versions"),
    join(home, ".local", "share", "mise", "installs", "node"),
  ]) {
    for (const version of listDir(base).sort(compareNodeDirs)) {
      dirs.push(join(base, version, "installation", "lib", "node_modules"), join(base, version, "lib", "node_modules"));
    }
  }
  return dirs;
}

function listDir(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

function compareNodeDirs(a: string, b: string): number {
  return compareVersions(b.replace(/^v/, ""), a.replace(/^v/, ""));
}

/** The native binary inside an `@dayone/cli` install. Running it directly skips `run.js`, which needs `node` on PATH. */
function candidatePaths(): string[] {
  const paths: string[] = [];
  for (const dir of globalNodeModulesDirs()) {
    paths.push(join(dir, CLI_PACKAGE, "node_modules", "@dayone", PLATFORM_PACKAGE, BINARY_NAME));
    paths.push(join(dir, "@dayone", PLATFORM_PACKAGE, BINARY_NAME));
  }
  return paths;
}

function exec(file: string, args: string[], options: { input?: string; timeout?: number } = {}) {
  if (isDemo()) {
    return new Promise<{ stdout: string; stderr: string }>((resolve, reject) =>
      setTimeout(() => {
        try {
          resolve({ stdout: demoStdout(args), stderr: "" });
        } catch (error) {
          reject(error);
        }
      }, DEMO_LATENCY_MS),
    );
  }
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = execFile(
      file,
      args,
      { timeout: options.timeout ?? 60_000, maxBuffer: 128 * 1024 * 1024, ...cliSpawnOptions() },
      (error, stdout, stderr) => {
        if (error) reject(Object.assign(error, { stdout, stderr }));
        else resolve({ stdout, stderr });
      },
    );
    // Secrets and entry text go in on stdin, never as arguments, so they never show up in a process list.
    child.stdin?.end(options.input ?? "");
  });
}

async function readVersion(path: string): Promise<string | null> {
  try {
    const { stdout } = await exec(path, ["--version"], { timeout: 10_000 });
    return parseCliVersion(stdout);
  } catch {
    return null;
  }
}

let found: Promise<CliInfo> | null = null;

const DEMO_CLI: CliInfo = { path: "dayone", version: MIN_CLI_VERSION, outdated: false };

/**
 * Finds the new Day One CLI. Throws `not-installed` when only the legacy Mac CLI (or nothing) is there.
 * Callers that start at once share one search; a failed search isn't remembered, so installing the CLI takes effect.
 */
export function findCli(force = false): Promise<CliInfo> {
  if (isDemo()) return Promise.resolve(DEMO_CLI);
  if (!found || force) {
    const search = discoverCli();
    found = search;
    search.catch(() => {
      if (found === search) found = null;
    });
  }
  return found;
}

async function discoverCli(): Promise<CliInfo> {
  const { cliPath } = getPreferenceValues<Preferences>();
  const candidates = cliPath ? [cliPath] : candidatePaths().filter((p) => existsSync(p));
  for (const path of candidates) {
    const version = await readVersion(path);
    if (version) {
      const info = { path, version, outdated: compareVersions(version, MIN_CLI_VERSION) < 0 };
      log.debug("found the CLI", { version, from: cliPath ? "preference" : "auto-detected", outdated: info.outdated });
      return info;
    }
  }
  log.warn("no Day One CLI found", { checked: candidates.length, preference: Boolean(cliPath) });
  if (cliPath) {
    throw new DayOneCliError(`The file set in preferences isn't the Day One CLI: ${cliPath}`, "not-installed");
  }
  throw new DayOneCliError("The Day One CLI isn't installed", "not-installed");
}

/** The CLI, or an `outdated` error when it's older than this extension supports. Everything that runs it goes here. */
export async function findUsableCli(): Promise<CliInfo> {
  const cli = await findCli();
  if (cli.outdated) {
    throw new DayOneCliError(
      `Day One CLI ${cli.version} is older than ${MIN_CLI_VERSION}, which this extension needs`,
      "outdated",
    );
  }
  return cli;
}

/** Runs the CLI and returns its parsed JSON. Errors carry the CLI's own message (stderr), never the command's stdout. */
export async function runCli<T>(args: string[], options: { input?: string; timeout?: number } = {}): Promise<T> {
  const cli = await findUsableCli();
  // Log the subcommand only: later arguments can hold an email address or a search query.
  const name = subcommand(args);
  const started = performance.now();
  try {
    const { stdout } = await exec(cli.path, args, options);
    log.debug(`${name} ok`, { ms: Math.round(performance.now() - started) });
    return JSON.parse(stdout) as T;
  } catch (error) {
    log.warn(`${name} failed`, { ms: Math.round(performance.now() - started) });
    if (error instanceof SyntaxError)
      throw new DayOneCliError("The Day One CLI returned output this extension can't read");
    const { stderr, killed } = error as { stderr?: string; killed?: boolean };
    if (killed) throw new DayOneCliError("The Day One CLI took too long to answer");
    const message = lastErrorLine(stderr) || (error instanceof Error ? error.message : String(error));
    throw new DayOneCliError(message);
  }
}

/** stderr can hold `[sync]` progress before the real error; the error is the last non-progress line block. */
export function lastErrorLine(stderr = ""): string {
  return stderr
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith("[sync]"))
    .join("\n")
    .trim();
}

let modelDownload: Promise<void> | null = null;

/**
 * Downloads the search model if it isn't on disk yet, once per process: a search runs it, and the CLI fetches the
 * model on first use. Concurrent callers share the one download.
 */
export function ensureSearchModel(): Promise<void> {
  if (isSearchModelDownloaded()) return Promise.resolve();
  if (!modelDownload) log.info("downloading the search model");
  modelDownload ??= runCli(["search", "entries", "--query", "day one", "--limit", "1"], { timeout: 10 * 60_000 })
    .then(() => undefined)
    .finally(() => {
      modelDownload = null;
    });
  return modelDownload;
}
