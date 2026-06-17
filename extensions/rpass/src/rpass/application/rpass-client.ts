import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

interface OtpResult {
  name: string;
  code: string;
  remaining_seconds: number;
  period: number;
}

interface GenerateEntryResult {
  name: string;
  password: string;
}

interface GenerateSecretResult {
  name?: string;
  password: string;
  dry_run: boolean;
}

interface WriteEntryResult {
  name: string;
}

interface MoveEntryResult {
  old_name: string;
  new_name: string;
}

interface RemoveEntryResult {
  name: string;
}

interface InitStoreResult {
  path: string;
  recipients: string[];
  removed: boolean;
}

interface DoctorReport {
  ok: boolean;
  store_dir: string;
  checks: { name: string; ok: boolean; message: string }[];
}

interface GitResult {
  stdout: string;
  stderr: string;
  exit_code: number;
}

interface PasswordGenerateOptions {
  kind: "password";
  length?: number;
  lowercase?: boolean;
  uppercase?: boolean;
  numbers?: boolean;
  symbols?: boolean;
  symbolCharacters?: string;
  force?: boolean;
}

interface PassphraseGenerateOptions {
  kind: "phrase";
  words?: number;
  separator?: string;
  capitalize?: boolean;
  number?: boolean;
  force?: boolean;
}

type GenerateEntryOptions = PasswordGenerateOptions | PassphraseGenerateOptions;

const DEFAULT_RPASS_TIMEOUT_MS = 10000;
const UNLOCK_WITH_PASSPHRASE_TIMEOUT_MS = 60000;
export const OPTIMISTIC_AGENT_UNLOCK_TIMEOUT_MS = 3000;

let executablePathOverride: string | undefined;
let gpgExecutablePathOverride: string | undefined;

function getExecutableCandidates(): string[] {
  const home = homedir();
  return [
    home ? join(home, ".cargo", "bin", "rpass") : undefined,
    "/opt/homebrew/bin/rpass",
    "/usr/local/bin/rpass",
    "/usr/bin/rpass",
  ].filter((candidate): candidate is string => Boolean(candidate));
}

function resolveExecutable(): string {
  const configuredPath = executablePathOverride?.trim();
  if (configuredPath) return configuredPath;

  return (
    getExecutableCandidates().find((candidate) => existsSync(candidate)) ||
    "rpass"
  );
}

function getGpgExecutableCandidates(): string[] {
  return [
    "/opt/homebrew/bin/gpg",
    "/usr/local/bin/gpg",
    "/usr/bin/gpg",
    "/opt/homebrew/bin/gpg2",
    "/usr/local/bin/gpg2",
    "/usr/bin/gpg2",
  ];
}

function resolveGpgExecutable(): string | undefined {
  const configuredPath = gpgExecutablePathOverride?.trim();
  if (configuredPath) return configuredPath;

  if (process.env.PASSWORD_STORE_GPG?.trim()) return undefined;

  return getGpgExecutableCandidates().find((candidate) =>
    existsSync(candidate),
  );
}

function withRaycastCliPath(pathValue: string | undefined): string {
  const cliDirs = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"];
  const pathParts = (pathValue ?? "").split(":").filter(Boolean);
  return [...new Set([...cliDirs, ...pathParts])].join(":");
}

function getChildEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: withRaycastCliPath(process.env.PATH),
  };
  const gpgExecutable = resolveGpgExecutable();
  if (gpgExecutable) env.PASSWORD_STORE_GPG = gpgExecutable;
  return env;
}

export function setRpassExecutablePath(path: string | undefined): void {
  executablePathOverride = path;
}

export function setGpgExecutablePath(path: string | undefined): void {
  gpgExecutablePathOverride = path;
}

export function setRpassExecutablePathForTests(path: string | undefined): void {
  setRpassExecutablePath(path);
}

export function setGpgExecutablePathForTests(path: string | undefined): void {
  setGpgExecutablePath(path);
}

export class RpassError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: string,
  ) {
    super(message);
    this.name = "RpassError";
  }
}

function parseRpassError(stderr: string, code: number | null): RpassError {
  try {
    const parsed = JSON.parse(stderr) as {
      error?: { code?: string; message?: string };
    };
    if (parsed.error?.code && parsed.error.message) {
      return new RpassError(parsed.error.code, parsed.error.message, stderr);
    }
  } catch {
    // Fall through to generic error.
  }

  const details = [
    `exit code: ${code ?? "unknown"}`,
    stderr.trim() ? `stderr:\n${stderr.trim()}` : undefined,
  ]
    .filter(Boolean)
    .join("\n\n");

  return new RpassError("rpass_failed", "rpass command failed", details);
}

async function runRaw(
  args: string[],
  stdin?: string,
  options: { timeoutMs?: number } = {},
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  const executable = resolveExecutable();

  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      env: getChildEnv(),
      stdio: [stdin === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    });
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new RpassError("rpass_timeout", "rpass timed out"));
    }, options.timeoutMs ?? DEFAULT_RPASS_TIMEOUT_MS);

    if (!child.stdout || !child.stderr) {
      clearTimeout(timeout);
      reject(new RpassError("rpass_spawn_failed", "rpass stdio unavailable"));
      return;
    }

    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(new RpassError("rpass_spawn_failed", error.message));
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve({ stdout, stderr, code });
    });

    if (stdin !== undefined && child.stdin) {
      child.stdin.on("error", () => {
        // GPG may exit before reading stdin when decryption fails.
      });
      child.stdin.end(stdin);
    }
  });
}

async function run(
  args: string[],
  stdin?: string,
  options: { timeoutMs?: number } = {},
): Promise<string> {
  const { stdout, stderr, code } = await runRaw(args, stdin, options);
  if (code === 0) return stdout;
  throw parseRpassError(stderr, code);
}

export async function listEntries(storeDir: string): Promise<string[]> {
  const stdout = await run(["--store-dir", storeDir, "list", "--json"]);
  return parseJson<string[]>(stdout);
}

interface ShowEntryJson {
  password: string;
  fields: { name: string; value: string }[];
  otp_uri?: string;
  extra_lines: string[];
}

function parseJson<T>(stdout: string): T {
  try {
    return JSON.parse(stdout) as T;
  } catch (error) {
    throw new RpassError(
      "rpass_invalid_json",
      "rpass returned invalid JSON",
      error instanceof Error ? error.message : String(error),
    );
  }
}

function formatShowEntryOutput(entry: ShowEntryJson): string {
  return [
    entry.password,
    ...entry.fields.map((field) => `${field.name}: ${field.value}`),
    entry.otp_uri,
    ...entry.extra_lines,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function showEntryContent(
  entry: string,
  storeDir: string,
  passphrase?: string,
  options: { timeoutMs?: number } = {},
): Promise<ShowEntryJson> {
  const args = ["--store-dir", storeDir, "show", "--json"];
  if (passphrase !== undefined) args.push("--passphrase-stdin");
  args.push(entry);

  const stdout = await run(args, passphrase, {
    timeoutMs:
      options.timeoutMs ??
      (passphrase !== undefined
        ? UNLOCK_WITH_PASSPHRASE_TIMEOUT_MS
        : DEFAULT_RPASS_TIMEOUT_MS),
  });
  return parseJson<ShowEntryJson>(stdout);
}

export async function showEntry(
  entry: string,
  storeDir: string,
  passphrase?: string,
  options: { timeoutMs?: number } = {},
): Promise<string> {
  return formatShowEntryOutput(
    await showEntryContent(entry, storeDir, passphrase, options),
  );
}

export async function generateEntry(
  entry: string,
  storeDir: string,
  options: GenerateEntryOptions,
): Promise<GenerateEntryResult> {
  const args = ["--store-dir", storeDir, "generate", entry, "--json"];

  appendGenerateOptions(args, options);
  if (options.force) args.push("--force");

  const stdout = await run(args);
  return parseJson<GenerateEntryResult>(stdout);
}

function appendGenerateOptions(
  args: string[],
  options: GenerateEntryOptions,
): void {
  if (options.kind === "phrase") {
    args.push("--phrase");
    if (options.words !== undefined)
      args.push("--words", String(options.words));
    if (options.separator !== undefined)
      args.push("--separator", options.separator);
    if (options.capitalize) args.push("--capitalize");
    if (options.number) args.push("--number");
  } else {
    if (options.length !== undefined)
      args.push("--length", String(options.length));
    if (options.lowercase === false) args.push("--no-lowercase");
    if (options.uppercase === false) args.push("--no-uppercase");
    if (options.numbers === false) args.push("--no-numbers");
    if (options.symbols === false) {
      args.push("--no-symbols");
    } else if (options.symbolCharacters) {
      args.push("--symbols", options.symbolCharacters);
    }
  }
}

export async function generateSecret(
  options: GenerateEntryOptions,
): Promise<GenerateSecretResult> {
  const args = ["generate", "--dry-run", "--json"];
  appendGenerateOptions(args, options);
  const stdout = await run(args);
  return parseJson<GenerateSecretResult>(stdout);
}

export async function doctor(storeDir: string): Promise<DoctorReport> {
  const { stdout, stderr, code } = await runRaw([
    "--store-dir",
    storeDir,
    "doctor",
    "--json",
  ]);
  if (stdout.trim()) return parseJson<DoctorReport>(stdout);
  if (code === 0) {
    throw new RpassError(
      "rpass_empty_output",
      "rpass exited successfully without producing output",
    );
  }
  throw parseRpassError(stderr, code);
}

export async function initStore(
  recipients: string[],
  storeDir: string,
): Promise<InitStoreResult> {
  const stdout = await run([
    "--store-dir",
    storeDir,
    "init",
    "--json",
    ...recipients,
  ]);
  return parseJson<InitStoreResult>(stdout);
}

export async function writeEntry(
  entry: string,
  storeDir: string,
  content: string,
  options: { force?: boolean } = {},
): Promise<WriteEntryResult> {
  const args = ["--store-dir", storeDir, "insert", "--multiline", "--json"];
  if (options.force) args.push("--force");
  args.push(entry);

  const stdin = content.endsWith("\n") ? content : `${content}\n`;
  const stdout = await run(args, stdin);
  return parseJson<WriteEntryResult>(stdout);
}

export async function moveEntry(
  oldEntry: string,
  newEntry: string,
  storeDir: string,
  options: { force?: boolean } = {},
): Promise<MoveEntryResult> {
  const args = ["--store-dir", storeDir, "mv"];
  if (options.force) args.push("--force");
  args.push(oldEntry, newEntry, "--json");

  const stdout = await run(args);
  return parseJson<MoveEntryResult>(stdout);
}

export async function gitCommand(
  args: string[],
  storeDir: string,
): Promise<GitResult> {
  const stdout = await run(["--store-dir", storeDir, "git", "--json", ...args]);
  return parseJson<GitResult>(stdout);
}

export async function removeEntry(
  entry: string,
  storeDir: string,
): Promise<RemoveEntryResult> {
  const stdout = await run([
    "--store-dir",
    storeDir,
    "rm",
    "--force",
    entry,
    "--json",
  ]);
  return parseJson<RemoveEntryResult>(stdout);
}

export async function generateOtp(
  entry: string,
  storeDir: string,
  passphrase?: string,
): Promise<OtpResult> {
  const args = ["--store-dir", storeDir, "otp", "--json"];
  if (passphrase !== undefined) args.push("--passphrase-stdin");
  args.push(entry);
  const stdout = await run(args, passphrase, {
    timeoutMs:
      passphrase !== undefined
        ? UNLOCK_WITH_PASSPHRASE_TIMEOUT_MS
        : DEFAULT_RPASS_TIMEOUT_MS,
  });
  return parseJson<OtpResult>(stdout);
}

export async function version(): Promise<void> {
  await run(["--version"]);
}

export type {
  GenerateEntryOptions,
  DoctorReport,
  GenerateEntryResult,
  GenerateSecretResult,
  GitResult,
  InitStoreResult,
  MoveEntryResult,
  OtpResult,
  RemoveEntryResult,
  ShowEntryJson,
  WriteEntryResult,
};
