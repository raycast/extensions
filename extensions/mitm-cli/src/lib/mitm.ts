import { confirmAlert, environment, getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Starting or trusting the root CA can raise a keychain prompt, and a prompt
 * outlives any default timeout: the command has to wait for the answer.
 */
const PROMPT_TIMEOUT_MILLISECONDS = 120_000;

interface Preferences {
  mitmPath?: string;
}

interface CommandError extends Error {
  stderr?: string;
}

function resolveScript(): string {
  const { mitmPath } = getPreferenceValues<Preferences>();
  const candidates = [
    mitmPath,
    join(environment.assetsPath, "mitm"),
    `${homedir()}/scripts/mitm`,
    "/opt/homebrew/bin/mitm",
    "/usr/local/bin/mitm",
  ].filter((candidate): candidate is string =>
    Boolean(candidate && candidate.trim()),
  );

  const script = candidates.find((candidate) => existsSync(candidate));
  if (!script) {
    throw new Error(
      "mitm script not found. Reinstall the extension, or set a custom path in the extension preferences.",
    );
  }
  return script;
}

// The script explains every failure on stderr, so that is what the user needs to
// see: execFile's own message is just "Command failed".
function describeError(error: unknown): string {
  if (error instanceof Error) {
    const stderr = (error as CommandError).stderr?.trim();
    return stderr || error.message;
  }
  return String(error);
}

export async function runMitm(
  arguments_: string[],
  timeoutMilliseconds = 30_000,
): Promise<string> {
  try {
    const { stdout } = await execFileAsync(
      "/bin/zsh",
      [resolveScript(), ...arguments_],
      {
        timeout: timeoutMilliseconds,
        // Starting the proxy must not take over the browser: the commands that
        // need the UI offer it as an explicit action instead.
        env: { ...process.env, MITM_NO_OPEN: "1" },
      },
    );
    return stdout.trim();
  } catch (error) {
    throw new Error(describeError(error));
  }
}

async function runMitmJson<Result>(arguments_: string[]): Promise<Result> {
  const output = await runMitm([...arguments_, "--json"]);
  return JSON.parse(output) as Result;
}

export interface ProxyStatus {
  running: boolean;
  pid: number | null;
  ui: string;
  password: string | null;
  service: string | null;
  interface: string | null;
  proxy: boolean;
  https: boolean;
  bypass: string[];
  ca: boolean;
}

export interface Flow {
  id: string;
  method: string;
  scheme: string;
  host: string;
  port: number;
  path: string;
  status: number;
  size: number;
  started: number;
  duration: number;
}

export function getStatus(): Promise<ProxyStatus> {
  return runMitmJson<ProxyStatus>(["status"]);
}

export function getFlows(count = 200): Promise<Flow[]> {
  return runMitmJson<Flow[]>(["flows", String(count)]);
}

/**
 * Trusting the root CA is what makes HTTPS interception work, so no start path
 * may reach it silently: every command that can start the proxy asks first.
 */
export async function confirmRootCertificate(
  status: ProxyStatus,
): Promise<boolean> {
  if (status.ca) {
    return true;
  }
  return confirmAlert({
    title: "Trust the mitmproxy root CA?",
    message:
      "mitmproxy decrypts HTTPS with its own certificate authority. Continuing trusts that CA in your login keychain; `mitm untrust` removes it again.",
    primaryAction: { title: "Trust and Start" },
  });
}

/**
 * Starts or stops the proxy, asking for confirmation first when starting would
 * trust the root CA. Returns false when the user declines.
 */
export async function toggleProxy(): Promise<boolean> {
  const status = await getStatus();
  if (!status.running && !(await confirmRootCertificate(status))) {
    return false;
  }
  await runMitm(["toggle"], PROMPT_TIMEOUT_MILLISECONDS);
  return true;
}

export function trustRootCertificate(): Promise<string> {
  return runMitm(["trust"], PROMPT_TIMEOUT_MILLISECONDS);
}

export function untrustRootCertificate(): Promise<string> {
  return runMitm(["untrust"]);
}

export function flowUrl(flow: Flow): string {
  const defaultPort = flow.scheme === "https" ? 443 : 80;
  const port = flow.port && flow.port !== defaultPort ? `:${flow.port}` : "";
  return `${flow.scheme}://${flow.host}${port}${flow.path}`;
}
