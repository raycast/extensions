import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { accessSync, constants, existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
import {
  blockKindLabel,
  blockKindMatchesExpected,
  decodeCliOutput,
  extractCliError,
  looksLikeCliError,
  looksLikeHelpOutput,
  parseBlockList,
  parseBlockState,
  type BlockKind,
  type BlockState,
  type ParsedBlock,
} from "./cli-output";
import { buildStatusArgs } from "./command-builders";

const DEFAULT_TIMEOUT_MS = 15_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 120_000;
const MIN_COMMAND_GAP_MS = 40;

const DEFAULT_EXECUTABLES = {
  darwin: "/Applications/Cold Turkey Blocker.app/Contents/MacOS/Cold Turkey Blocker",
  win32: "C:\\Program Files\\Cold Turkey\\Cold Turkey Blocker.exe",
} as const;

export interface CliResult {
  stdout: string;
  stderr: string;
  output: string;
  durationMs: number;
}

export type BlockDescriptor = ParsedBlock;

export interface BlockInfo extends BlockDescriptor {
  state: BlockState;
  rawStatus: string;
}

export type CliErrorKind =
  | "unsupported-platform"
  | "missing-executable"
  | "permission-denied"
  | "timeout"
  | "command-failed"
  | "unparseable-output"
  | "verification-failed";

export class ColdTurkeyCliError extends Error {
  readonly kind: CliErrorKind;
  readonly output?: string;
  readonly executablePath?: string;
  readonly exitCode?: string | number | null;

  constructor(
    message: string,
    options: {
      kind: CliErrorKind;
      output?: string;
      executablePath?: string;
      exitCode?: string | number | null;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options.cause });
    this.name = "ColdTurkeyCliError";
    this.kind = options.kind;
    this.output = options.output;
    this.executablePath = options.executablePath;
    this.exitCode = options.exitCode;
  }
}

let cliQueue: Promise<void> = Promise.resolve();
let lastCommandFinishedAt = 0;

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function getExecutablePath(): string {
  const configured = getPreferences().executablePath?.trim();
  const fallback = process.platform === "darwin" ? DEFAULT_EXECUTABLES.darwin : DEFAULT_EXECUTABLES.win32;
  return expandHome(stripMatchingQuotes(configured || fallback));
}

export function getCommandTimeoutMs(): number {
  const raw = Number.parseInt(getPreferences().commandTimeoutMs ?? "", 10);
  if (!Number.isFinite(raw)) return DEFAULT_TIMEOUT_MS;
  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, raw));
}

export function getCliContext(): {
  platform: string;
  executablePath: string;
  executableExists: boolean;
  timeoutMs: number;
} {
  const executablePath = getExecutablePath();
  return {
    platform: platformDisplayName(),
    executablePath,
    executableExists: existsSync(executablePath),
    timeoutMs: getCommandTimeoutMs(),
  };
}

/**
 * Executes one Cold Turkey CLI process at a time. The native CLI appears to share
 * state with the desktop app, so overlapping status and mutation processes can
 * produce stale or unparseable output on some installations.
 */
export function runColdTurkey(args: string[]): Promise<CliResult> {
  const run = cliQueue.then(async () => {
    const remainingGap = MIN_COMMAND_GAP_MS - (Date.now() - lastCommandFinishedAt);
    if (remainingGap > 0) await sleep(remainingGap);

    try {
      return await executeColdTurkey(args);
    } finally {
      lastCommandFinishedAt = Date.now();
    }
  });

  cliQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function listBlocks(): Promise<BlockDescriptor[]> {
  const result = await runColdTurkey(["-list-blocks"]);

  if (looksLikeHelpOutput(result.output)) {
    throw new ColdTurkeyCliError(
      "Cold Turkey returned CLI help instead of a block list. Update Blocker to a version that supports -list-blocks.",
      {
        kind: "unparseable-output",
        output: result.output,
        executablePath: getExecutablePath(),
      },
    );
  }

  const blocks = parseBlockList(result.output);
  if (
    blocks.length > 0 ||
    !result.output ||
    /^no blocks(?: found)?\.?$/i.test(result.output) ||
    hasOnlyBlockSectionHeadings(result.output)
  ) {
    return blocks;
  }

  throw new ColdTurkeyCliError("Could not understand the output from -list-blocks.", {
    kind: "unparseable-output",
    output: result.output,
    executablePath: getExecutablePath(),
  });
}

export async function listBlockNames(): Promise<string[]> {
  return (await listBlocks()).map((block) => block.name);
}

export async function findBlock(blockName: string): Promise<BlockDescriptor | undefined> {
  const normalized = blockName.trim().toLocaleLowerCase();
  return (await listBlocks()).find((block) => block.name.toLocaleLowerCase() === normalized);
}

export async function getBlockStatus(block: string | BlockDescriptor): Promise<BlockInfo> {
  const descriptor: BlockDescriptor = typeof block === "string" ? { name: block, kind: "unknown" } : block;
  const result = await runColdTurkey(buildStatusArgs(descriptor.name));
  return {
    ...descriptor,
    state: parseBlockState(result.output),
    rawStatus: result.output,
  };
}

export async function getBlockStatusWithRetry(
  block: string | BlockDescriptor,
  options: { attempts?: number; initialDelayMs?: number } = {},
): Promise<BlockInfo> {
  const descriptor: BlockDescriptor = typeof block === "string" ? { name: block, kind: "unknown" } : block;
  const attempts = Math.max(1, options.attempts ?? 3);
  const initialDelayMs = Math.max(0, options.initialDelayMs ?? 0);
  let last: BlockInfo = {
    ...descriptor,
    state: "unknown",
    rawStatus: "No status response.",
  };

  if (initialDelayMs > 0) await sleep(initialDelayMs);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      last = await getBlockStatus(descriptor);
      if (last.state !== "unknown") return last;
    } catch (error) {
      last = {
        ...descriptor,
        state: "unknown",
        rawStatus: error instanceof Error ? error.message : String(error),
      };
    }

    if (attempt < attempts - 1) await sleep(100 * 2 ** attempt);
  }

  return last;
}

/** Lists first, then probes each returned name sequentially. */
export async function listBlocksWithStatus(): Promise<BlockInfo[]> {
  const blocks = await listBlocks();
  const results: BlockInfo[] = [];

  for (const block of blocks) {
    results.push(await getBlockStatusWithRetry(block, { attempts: 2 }));
  }

  return results;
}

export async function waitForBlockState(
  block: string | BlockDescriptor,
  expectedState: Exclude<BlockState, "unknown">,
  options: { attempts?: number; initialDelayMs?: number } = {},
): Promise<BlockInfo> {
  const descriptor: BlockDescriptor = typeof block === "string" ? { name: block, kind: "unknown" } : block;
  const attempts = Math.max(1, options.attempts ?? 6);
  const initialDelayMs = Math.max(0, options.initialDelayMs ?? 120);
  let last: BlockInfo = {
    ...descriptor,
    state: "unknown",
    rawStatus: "Status not checked.",
  };

  if (initialDelayMs > 0) await sleep(initialDelayMs);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    last = await getBlockStatusWithRetry(descriptor, { attempts: 1 });
    if (last.state === expectedState) return last;
    if (attempt < attempts - 1) await sleep(Math.min(1_000, 120 * 2 ** attempt));
  }

  const unknownDetail =
    last.state === "unknown" && last.rawStatus ? ` (${last.rawStatus.replace(/\s+/g, " ").trim()})` : "";
  const actual = last.state === "unknown" ? `could not be determined${unknownDetail}` : `is still ${last.state}`;
  const lockHint =
    expectedState === "disabled" && last.state === "enabled"
      ? " The block may still be locked; use its password or satisfy the configured lock conditions."
      : "";
  throw new ColdTurkeyCliError(
    `Cold Turkey accepted the command, but ${descriptor.name} ${actual}; expected ${expectedState}.${lockHint}`,
    {
      kind: "verification-failed",
      output: last.rawStatus,
      executablePath: getExecutablePath(),
    },
  );
}

export async function waitForKnownBlockState(
  block: string | BlockDescriptor,
  options: { attempts?: number; initialDelayMs?: number } = {},
): Promise<BlockInfo> {
  const descriptor: BlockDescriptor = typeof block === "string" ? { name: block, kind: "unknown" } : block;
  const attempts = Math.max(1, options.attempts ?? 6);
  const initialDelayMs = Math.max(0, options.initialDelayMs ?? 120);
  let last: BlockInfo = {
    ...descriptor,
    state: "unknown",
    rawStatus: "Status not checked.",
  };

  if (initialDelayMs > 0) await sleep(initialDelayMs);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    last = await getBlockStatusWithRetry(descriptor, { attempts: 1 });
    if (last.state !== "unknown") return last;
    if (attempt < attempts - 1) await sleep(Math.min(1_000, 120 * 2 ** attempt));
  }

  const detail = last.rawStatus ? ` Last response: ${last.rawStatus.replace(/\s+/g, " ").trim()}` : "";
  throw new ColdTurkeyCliError(
    `Cold Turkey accepted the command, but the status of ${descriptor.name} is unknown.${detail}`,
    {
      kind: "verification-failed",
      output: last.rawStatus,
      executablePath: getExecutablePath(),
    },
  );
}

export async function waitForBlockPresence(
  blockName: string,
  expectedKind: BlockKind,
  options: { attempts?: number; initialDelayMs?: number } = {},
): Promise<BlockDescriptor> {
  const attempts = Math.max(1, options.attempts ?? 6);
  const initialDelayMs = Math.max(0, options.initialDelayMs ?? 120);
  const normalizedName = blockName.trim().toLocaleLowerCase();
  let lastBlocks: BlockDescriptor[] = [];

  if (initialDelayMs > 0) await sleep(initialDelayMs);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    lastBlocks = await listBlocks();
    const found = lastBlocks.find((block) => block.name.toLocaleLowerCase() === normalizedName);
    if (found && blockKindMatchesExpected(found.kind, expectedKind)) return found;
    if (attempt < attempts - 1) await sleep(Math.min(1_000, 120 * 2 ** attempt));
  }

  const names = lastBlocks.map((block) => block.name).join(", ");
  const detail = names ? ` Blocks found: ${names}.` : " No blocks were returned.";
  throw new ColdTurkeyCliError(
    `Cold Turkey returned no error, but ${blockName} did not appear in the block list as a ${blockKindLabel(expectedKind)} block.${detail}`,
    {
      kind: "verification-failed",
      output: names ? `Blocks found: ${names}` : "No blocks were returned.",
      executablePath: getExecutablePath(),
    },
  );
}

export async function getCliHelp(): Promise<CliResult> {
  return runColdTurkey(["-help"]);
}

async function executeColdTurkey(args: string[]): Promise<CliResult> {
  assertSupportedPlatform();

  const executablePath = getExecutablePath();
  assertExecutable(executablePath);
  const startedAt = Date.now();

  return new Promise<CliResult>((resolve, reject) => {
    execFile(
      executablePath,
      args,
      {
        encoding: null,
        timeout: getCommandTimeoutMs(),
        windowsHide: true,
        maxBuffer: 1024 * 1024,
      },
      (error, stdout, stderr) => {
        const normalizedStdout = decodeCliOutput(stdout ?? Buffer.alloc(0));
        const normalizedStderr = decodeCliOutput(stderr ?? Buffer.alloc(0));
        const output = [normalizedStdout, normalizedStderr].filter(Boolean).join("\n").trim();
        const durationMs = Date.now() - startedAt;

        if (!error) {
          if (looksLikeCliError(output)) {
            reject(
              new ColdTurkeyCliError(extractCliError(output) ?? "Cold Turkey reported an error.", {
                kind: "command-failed",
                executablePath,
                output,
              }),
            );
            return;
          }
          resolve({
            stdout: normalizedStdout,
            stderr: normalizedStderr,
            output,
            durationMs,
          });
          return;
        }

        const processError = error as NodeJS.ErrnoException & {
          killed?: boolean;
          signal?: NodeJS.Signals | null;
          code?: string | number | null;
        };

        if (processError.code === "ENOENT") {
          reject(
            new ColdTurkeyCliError(`Cold Turkey executable was not found at ${executablePath}.`, {
              kind: "missing-executable",
              executablePath,
              output,
              cause: error,
            }),
          );
          return;
        }

        if (processError.code === "EACCES" || processError.code === "EPERM") {
          reject(
            new ColdTurkeyCliError(`Raycast cannot execute Cold Turkey at ${executablePath}.`, {
              kind: "permission-denied",
              executablePath,
              output,
              cause: error,
            }),
          );
          return;
        }

        if (processError.killed || processError.signal === "SIGTERM" || processError.code === "ETIMEDOUT") {
          const windowsTip =
            process.platform === "win32"
              ? " Fully exit the Blocker interface from its system tray icon, then retry."
              : " Make sure the Blocker interface is not preventing command-line access, then retry.";
          reject(
            new ColdTurkeyCliError(`Cold Turkey CLI timed out.${windowsTip}`, {
              kind: "timeout",
              executablePath,
              output,
              cause: error,
            }),
          );
          return;
        }

        reject(
          new ColdTurkeyCliError(
            extractCliError(output) || output || error.message || "Cold Turkey CLI command failed.",
            {
              kind: "command-failed",
              executablePath,
              output,
              exitCode: processError.code,
              cause: error,
            },
          ),
        );
      },
    );
  });
}

function assertSupportedPlatform(): void {
  if (process.platform === "darwin" || process.platform === "win32") return;
  throw new ColdTurkeyCliError(`Cold Turkey Blocker CLI is not supported on ${process.platform}.`, {
    kind: "unsupported-platform",
  });
}

function assertExecutable(executablePath: string): void {
  if (!existsSync(executablePath)) {
    throw new ColdTurkeyCliError(`Cold Turkey executable was not found at ${executablePath}.`, {
      kind: "missing-executable",
      executablePath,
    });
  }

  try {
    const stat = statSync(executablePath);
    if (!stat.isFile()) throw new Error("Path is not a file.");
    if (process.platform === "darwin") accessSync(executablePath, constants.X_OK);
  } catch (error) {
    throw new ColdTurkeyCliError(`Cold Turkey executable is not runnable at ${executablePath}.`, {
      kind: "permission-denied",
      executablePath,
      cause: error,
    });
  }
}

function stripMatchingQuotes(value: string): string {
  if (value.length < 2) return value;
  const first = value[0];
  const last = value[value.length - 1];
  return (first === '"' && last === '"') || (first === "'" && last === "'") ? value.slice(1, -1) : value;
}

function expandHome(value: string): string {
  if (value === "~") return homedir();
  if (value.startsWith("~/") || value.startsWith("~\\")) return `${homedir()}${value.slice(1)}`;
  return value;
}

function platformDisplayName(): string {
  if (process.platform === "darwin") return "macOS";
  if (process.platform === "win32") return "Windows";
  return process.platform;
}

function hasOnlyBlockSectionHeadings(output: string): boolean {
  const meaningful = output
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/[:\s]+$/, ""))
    .filter(Boolean);
  return (
    meaningful.length > 0 &&
    meaningful.every((line) =>
      /^(?:website\s*(?:&|and)\s*app\s+blocks?|website\s+blocks?|device\s+blocks?)$/i.test(line),
    )
  );
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
