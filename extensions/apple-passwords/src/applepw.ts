import { spawn } from "node:child_process";
import { resolve } from "node:path";

export interface ApplePwRunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  command?: string;
}

export interface ApplePwRunner {
  (command: string, args: string[]): Promise<ApplePwRunResult>;
}

export interface ApplePwSuccess<T> {
  kind: "success";
  payload: T;
  stdout: string;
  stderr: string;
}

export interface ApplePwAuthRequired {
  kind: "auth-required";
  prompt: string;
  stdout: string;
  stderr: string;
}

export type ApplePwCommandOutcome<T> = ApplePwSuccess<T> | ApplePwAuthRequired;

export interface ApplePwCliErrorOptions {
  command: string;
  args: string[];
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

export class ApplePwCliError extends Error {
  readonly command: string;
  readonly args: string[];
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;

  constructor(options: ApplePwCliErrorOptions) {
    const message = options.stderr.trim() || options.stdout.trim() || "applepw command failed";
    super(message);
    this.name = "ApplePwCliError";
    this.command = options.command;
    this.args = sanitizeLoggedArgs([...options.args]);
    this.exitCode = options.exitCode;
    this.stdout = options.stdout;
    this.stderr = options.stderr;
  }
}

export interface ApplePwAuthChallenge {
  salt: string;
  serverKey: string;
  username: string;
  clientKey: string;
}

export interface ApplePwAuthResponse {
  status: number;
}

export interface ApplePwPasswordEntry {
  id: string;
  username: string;
  domain: string;
  password: string;
  has_otp?: boolean;
}

export interface ApplePwOtpEntry {
  id: string;
  username: string;
  domain: string;
  code: string;
}

export interface ApplePwStatus {
  status: "ready" | "daemon_stopped" | "daemon_unresponsive" | "unauthenticated";
  daemon: "running" | "stopped" | "unresponsive";
  authenticated: boolean;
}

export interface ApplePwClient {
  getStatus(): Promise<ApplePwCommandOutcome<ApplePwStatus>>;
  listPasswords(query: string): Promise<ApplePwCommandOutcome<ApplePwPasswordEntry[]>>;
  getPassword(domain: string, username: string): Promise<ApplePwCommandOutcome<ApplePwPasswordEntry[]>>;
  getOtp(domain: string): Promise<ApplePwCommandOutcome<ApplePwOtpEntry[]>>;
  authenticate(pin: string): Promise<ApplePwAuthResponse>;
  execute<T extends object>(args: string[]): Promise<ApplePwCommandOutcome<T>>;
}

export interface ApplePwClientOptions {
  binaryPath?: string;
  env?: NodeJS.ProcessEnv;
  runner?: ApplePwRunner;
}

type ApplePwRequestPayload = {
  salt: string;
  serverKey: string;
  username: string;
  clientKey: string;
};

type ApplePwJsonPayload<T> = {
  results?: T[] | Record<string, T>;
  status?: number;
} & Record<string, unknown>;

const AUTH_PROMPT = "Enter PIN:";
const DEFAULT_REPO_BINARY_PATH = resolve(process.cwd(), "../../applepw");
const COMMON_BINARY_PATHS = ["/opt/homebrew/bin/applepw", "/usr/local/bin/applepw"];

export interface ApplePwBinaryResolutionOptions {
  binaryPath?: string;
  env?: NodeJS.ProcessEnv;
  repoFallbackPath?: string;
}

export function resolveApplePwBinaryCandidates(options: ApplePwBinaryResolutionOptions = {}): string[] {
  if (options.binaryPath?.trim()) {
    return [options.binaryPath.trim()];
  }

  const env = options.env ?? process.env;
  const envBinary = env.APPLEPW_BINARY_PATH?.trim() || env.APPLEPW_BIN?.trim() || env.APPLEPW_COMMAND?.trim();
  if (envBinary) {
    return [envBinary];
  }

  return ["applepw", ...COMMON_BINARY_PATHS, options.repoFallbackPath ?? DEFAULT_REPO_BINARY_PATH];
}

export function sanitizeLoggedArgs(args: string[]): string[] {
  return args.map((arg, index) => (args[index - 1] === "--pin" ? "[REDACTED]" : arg));
}

function createDefaultRunner(commandCandidates: string[]): ApplePwRunner {
  return async (_command, args) => {
    let lastError: unknown;

    for (const command of commandCandidates) {
      try {
        return await new Promise<ApplePwRunResult>((resolvePromise, rejectPromise) => {
          const child = spawn(command, args, {
            stdio: ["pipe", "pipe", "pipe"],
          });

          let stdout = "";
          let stderr = "";
          let settled = false;

          const settle = (result: ApplePwRunResult) => {
            if (settled) {
              return;
            }
            settled = true;
            resolvePromise({ ...result, command });
          };

          const fail = (error: Error) => {
            if (settled) {
              return;
            }
            settled = true;
            rejectPromise(error);
          };

          const maybeAuthRequired = () => {
            const combined = `${stdout}\n${stderr}`;
            if (!combined.includes(AUTH_PROMPT) || settled) {
              return false;
            }

            settled = true;
            child.kill("SIGTERM");
            resolvePromise({
              stdout,
              stderr,
              exitCode: null,
              signal: "SIGTERM",
              command,
            });
            return true;
          };

          child.stdout?.setEncoding("utf8");
          child.stderr?.setEncoding("utf8");

          child.stdout?.on("data", (chunk: string) => {
            stdout += chunk;
            maybeAuthRequired();
          });

          child.stderr?.on("data", (chunk: string) => {
            stderr += chunk;
            maybeAuthRequired();
          });

          child.on("error", fail);
          child.on("close", (exitCode, signal) => {
            settle({
              stdout,
              stderr,
              exitCode,
              signal,
            });
          });
        });
      } catch (error) {
        if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
          lastError = error;
          continue;
        }

        throw error;
      }
    }

    if (lastError instanceof Error && "message" in lastError) {
      throw new Error(
        `Unable to locate applepw binary. Tried: ${commandCandidates.map((candidate) => `"${candidate}"`).join(", ")}. Last error: ${lastError.message}`,
      );
    }

    throw new Error(
      `Unable to locate applepw binary. Tried: ${commandCandidates.map((candidate) => `"${candidate}"`).join(", ")}`,
    );
  };
}

function parseJsonPayload<T>(stdout: string, stderr: string): T {
  const buffers = [stdout, stderr]
    .flatMap((buffer) => {
      const trimmed = buffer.trim();
      if (!trimmed) {
        return [];
      }

      const lines = trimmed
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      return [trimmed, ...lines.reverse()];
    })
    .filter(Boolean);

  for (const candidate of buffers) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      continue;
    }
  }

  throw new Error("applepw did not return JSON output");
}

function toCommandError(command: string, args: string[], result: ApplePwRunResult): ApplePwCliError {
  return new ApplePwCliError({
    command: result.command ?? command,
    args,
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
  });
}

function isAuthPrompt(output: string): boolean {
  return output.includes(AUTH_PROMPT);
}

function buildCommandOutcome<T>(result: ApplePwRunResult, command: string, args: string[]): ApplePwCommandOutcome<T> {
  const combined = `${result.stdout}\n${result.stderr}`;
  if (isAuthPrompt(combined)) {
    return {
      kind: "auth-required",
      prompt: AUTH_PROMPT,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }

  if (result.exitCode !== 0) {
    throw toCommandError(command, args, result);
  }

  return {
    kind: "success",
    payload: parseJsonPayload<T>(result.stdout, result.stderr),
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function buildAuthResponseArgs(challenge: ApplePwRequestPayload, pin: string): string[] {
  return [
    "auth",
    "response",
    "--pin",
    pin,
    "--salt",
    challenge.salt,
    "--server-key",
    challenge.serverKey,
    "--client-key",
    challenge.clientKey,
    "--username",
    challenge.username,
  ];
}

function buildChallengeArgs(): string[] {
  return ["auth", "request"];
}

function buildStatusArgs(): string[] {
  return ["status"];
}

function buildListArgs(query: string): string[] {
  return ["pw", "list", query];
}

function buildPasswordArgs(domain: string, username: string): string[] {
  return ["pw", "get", domain, username];
}

function buildOtpArgs(domain: string): string[] {
  return ["otp", "get", domain];
}

function normalizeResults<T>(results: T[] | Record<string, T> | undefined): T[] {
  if (!results) {
    return [];
  }

  return Array.isArray(results) ? results : Object.values(results);
}

export function createApplePwClient(options: ApplePwClientOptions = {}): ApplePwClient {
  const binaryCandidates = resolveApplePwBinaryCandidates({
    binaryPath: options.binaryPath,
    env: options.env,
  });
  const runner = options.runner ?? createDefaultRunner(binaryCandidates);
  const binaryPath = binaryCandidates[0];

  async function execute<T extends object>(args: string[]): Promise<ApplePwCommandOutcome<T>> {
    const result = await runner(binaryPath, args);
    return buildCommandOutcome<T>(result, binaryPath, args);
  }

  async function requestChallenge(): Promise<ApplePwRequestPayload> {
    const response = await execute<ApplePwRequestPayload>(buildChallengeArgs());
    if (response.kind !== "success" || !response.payload) {
      throw new ApplePwCliError({
        command: binaryPath,
        args: buildChallengeArgs(),
        exitCode: null,
        stdout: response.stdout,
        stderr: response.stderr,
      });
    }

    return response.payload;
  }

  async function authenticate(pin: string): Promise<ApplePwAuthResponse> {
    const challenge = await requestChallenge();
    const response = await execute<ApplePwAuthResponse>(buildAuthResponseArgs(challenge, pin));

    if (response.kind !== "success" || !response.payload) {
      throw new ApplePwCliError({
        command: binaryPath,
        args: buildAuthResponseArgs(challenge, pin),
        exitCode: null,
        stdout: response.stdout,
        stderr: response.stderr,
      });
    }

    return response.payload;
  }

  async function listPasswords(query: string): Promise<ApplePwCommandOutcome<ApplePwPasswordEntry[]>> {
    const response = await execute<ApplePwJsonPayload<ApplePwPasswordEntry>>(buildListArgs(query));
    if (response.kind === "auth-required") {
      return response;
    }

    return {
      kind: "success",
      payload: normalizeResults(response.payload?.results),
      stdout: response.stdout,
      stderr: response.stderr,
    };
  }

  async function getPassword(domain: string, username: string): Promise<ApplePwCommandOutcome<ApplePwPasswordEntry[]>> {
    const response = await execute<ApplePwJsonPayload<ApplePwPasswordEntry>>(buildPasswordArgs(domain, username));
    if (response.kind === "auth-required") {
      return response;
    }
    return {
      kind: "success",
      payload: normalizeResults(response.payload?.results),
      stdout: response.stdout,
      stderr: response.stderr,
    };
  }

  async function getOtp(domain: string): Promise<ApplePwCommandOutcome<ApplePwOtpEntry[]>> {
    const response = await execute<ApplePwJsonPayload<ApplePwOtpEntry>>(buildOtpArgs(domain));
    if (response.kind === "auth-required") {
      return response;
    }

    return {
      kind: "success",
      payload: normalizeResults(response.payload?.results),
      stdout: response.stdout,
      stderr: response.stderr,
    };
  }

  async function getStatus(): Promise<ApplePwCommandOutcome<ApplePwStatus>> {
    return await execute<ApplePwStatus>(buildStatusArgs());
  }

  return {
    getStatus,
    listPasswords,
    getPassword,
    getOtp,
    authenticate,
    execute,
  };
}

const defaultClient = createApplePwClient();

export async function executeApplePw<T extends object>(args: string[]): Promise<ApplePwCommandOutcome<T>> {
  return defaultClient.execute<T>(args);
}

export async function listPasswords(query: string): Promise<ApplePwCommandOutcome<ApplePwPasswordEntry[]>> {
  return defaultClient.listPasswords(query);
}

export async function getPassword(
  domain: string,
  username: string,
): Promise<ApplePwCommandOutcome<ApplePwPasswordEntry[]>> {
  return defaultClient.getPassword(domain, username);
}

export async function getOtp(domain: string): Promise<ApplePwCommandOutcome<ApplePwOtpEntry[]>> {
  return defaultClient.getOtp(domain);
}

export async function authenticate(pin: string): Promise<ApplePwAuthResponse> {
  return defaultClient.authenticate(pin);
}

export { buildAuthResponseArgs };
