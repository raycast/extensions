import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getPreferenceValues } from "@raycast/api";
import { COMMAND_TIMEOUT_MS, DEFAULT_BINARY_PATH, MAX_BUFFER, SERVICE_START_TIMEOUT_MS } from "./constants";
import type { RawContainer, RawImage, RawVolume, SystemDf, SystemStatus } from "./types";

const execFileAsync = promisify(execFile);

export function getBinaryPath(): string {
  const { containerPath } = getPreferenceValues<Preferences>();
  return containerPath.trim() || DEFAULT_BINARY_PATH;
}

export function getAutoRefresh(): boolean {
  return getPreferenceValues<Preferences>().autoRefresh;
}

export type ContainerErrorKind = "service-down" | "not-found" | "exec" | "parse" | "unknown";

/** A classified failure from invoking the `container` CLI. */
export class ContainerError extends Error {
  readonly kind: ContainerErrorKind;
  readonly stdout: string;
  readonly stderr: string;
  readonly code: number | null;

  constructor(args: {
    message: string;
    kind: ContainerErrorKind;
    stdout?: string;
    stderr?: string;
    code?: number | null;
  }) {
    super(args.message);
    this.name = "ContainerError";
    this.kind = args.kind;
    this.stdout = args.stdout ?? "";
    this.stderr = args.stderr ?? "";
    this.code = args.code ?? null;
  }
}

const SERVICE_DOWN_MARKERS = [
  "xpc connection error",
  "container system start",
  "apiserver is not running",
  "not registered with launchd",
];

/** True when CLI output indicates the XPC daemon / apiserver is unreachable. */
export function isServiceDownOutput(text: string): boolean {
  const haystack = text.toLowerCase();
  return SERVICE_DOWN_MARKERS.some((marker) => haystack.includes(marker));
}

/** Extracts a human-readable message from any thrown value. */
export function errorMessage(error: unknown): string {
  if (error instanceof ContainerError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

interface ExecLikeError {
  code?: number | string;
  stdout?: string;
  stderr?: string;
  killed?: boolean;
  name?: string;
}

function classifyError(error: unknown, binary: string): ContainerError {
  if (error instanceof Error && error.name === "AbortError") {
    return new ContainerError({ message: "Operation cancelled.", kind: "unknown" });
  }

  const execError = (error ?? {}) as ExecLikeError;
  const stdout = execError.stdout ?? "";
  const stderr = execError.stderr ?? "";
  const exitCode = typeof execError.code === "number" ? execError.code : null;

  if (execError.code === "ENOENT") {
    return new ContainerError({
      message: `The container binary was not found at "${binary}". Install it from github.com/apple/container or set the correct path in this extension's preferences.`,
      kind: "not-found",
    });
  }

  if (isServiceDownOutput(`${stderr}\n${stdout}`)) {
    return new ContainerError({
      message: "The container system service is not running.",
      kind: "service-down",
      stdout,
      stderr,
      code: exitCode,
    });
  }

  const message = stderr.trim() || (error instanceof Error ? error.message : "") || "container command failed.";
  return new ContainerError({ message, kind: "exec", stdout, stderr, code: exitCode });
}

interface RunOptions {
  timeout?: number;
  signal?: AbortSignal;
}

/** Runs the binary and returns raw stdio. Throws a classified ContainerError on failure. */
export async function runContainer(
  args: string[],
  options: RunOptions = {},
): Promise<{ stdout: string; stderr: string }> {
  const binary = getBinaryPath();
  try {
    const { stdout, stderr } = await execFileAsync(binary, args, {
      timeout: options.timeout ?? COMMAND_TIMEOUT_MS,
      maxBuffer: MAX_BUFFER,
      signal: options.signal,
    });
    return { stdout: stdout.toString(), stderr: stderr.toString() };
  } catch (error) {
    throw classifyError(error, binary);
  }
}

/** Runs the binary and parses its stdout as JSON. Returns `fallback` for empty output. */
export async function runContainerJSON<T>(args: string[], options: RunOptions & { fallback?: T } = {}): Promise<T> {
  const { stdout } = await runContainer(args, options);
  const trimmed = stdout.trim();
  if (trimmed === "") {
    if (options.fallback !== undefined) {
      return options.fallback;
    }
    throw new ContainerError({ message: "container returned no output.", kind: "parse" });
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new ContainerError({
      message: "Failed to parse JSON output from container.",
      kind: "parse",
      stdout: trimmed.slice(0, 500),
    });
  }
}

/** Runs a mutating command, ignoring stdout. Throws a classified ContainerError on failure. */
export async function runContainerMutation(args: string[], options: RunOptions = {}): Promise<void> {
  await runContainer(args, options);
}

// ---------------------------------------------------------------------------
// Typed convenience wrappers
// ---------------------------------------------------------------------------

export function listContainers(all = true, signal?: AbortSignal): Promise<RawContainer[]> {
  const args = all ? ["list", "--all", "--format", "json"] : ["list", "--format", "json"];
  return runContainerJSON<RawContainer[]>(args, { fallback: [], signal });
}

export function inspectContainer(id: string, signal?: AbortSignal): Promise<RawContainer[]> {
  return runContainerJSON<RawContainer[]>(["inspect", id], { signal });
}

export function listImages(signal?: AbortSignal): Promise<RawImage[]> {
  return runContainerJSON<RawImage[]>(["image", "list", "--format", "json"], { fallback: [], signal });
}

export function listVolumes(signal?: AbortSignal): Promise<RawVolume[]> {
  return runContainerJSON<RawVolume[]>(["volume", "list", "--format", "json"], { fallback: [], signal });
}

export async function systemStatus(signal?: AbortSignal): Promise<SystemStatus> {
  try {
    return await runContainerJSON<SystemStatus>(["system", "status", "--format", "json"], { signal });
  } catch (error) {
    // When the service is stopped, `system status` exits non-zero but still
    // prints a `{ "status": "not running" }` body — surface that as content
    // rather than an error. A true XPC failure leaves stdout empty and rethrows.
    if (error instanceof ContainerError && error.stdout.trim() !== "") {
      try {
        return JSON.parse(error.stdout) as SystemStatus;
      } catch {
        // fall through and rethrow the original error
      }
    }
    throw error;
  }
}

export function systemDf(signal?: AbortSignal): Promise<SystemDf> {
  return runContainerJSON<SystemDf>(["system", "df", "--format", "json"], { signal });
}

export function startService(): Promise<void> {
  return runContainerMutation(["system", "start"], { timeout: SERVICE_START_TIMEOUT_MS });
}

export function stopService(): Promise<void> {
  return runContainerMutation(["system", "stop"], { timeout: SERVICE_START_TIMEOUT_MS });
}
