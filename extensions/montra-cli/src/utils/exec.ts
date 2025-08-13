import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { Buffer } from "node:buffer";
import { promisify } from "node:util";

const pexecFile = promisify(execFile);

export type Environment = "development" | "staging" | "production";
export type OutputFormat = "pretty" | "json";

interface Prefs {
  montraBinaryPath?: string;
  defaultEnvironment?: Environment;
  defaultOutputFormat?: OutputFormat;
}

export function getPrefs(): Required<Prefs> {
  const prefs = getPreferenceValues<Prefs>();
  return {
    montraBinaryPath: prefs.montraBinaryPath || "",
    defaultEnvironment: (prefs.defaultEnvironment as Environment) || "development",
    defaultOutputFormat: (prefs.defaultOutputFormat as OutputFormat) || "pretty",
  };
}

export function resolveMontraPath(): string {
  const { montraBinaryPath } = getPrefs();
  return montraBinaryPath && montraBinaryPath.trim().length > 0 ? montraBinaryPath : "montra";
}

export async function runMontra(
  args: string[],
  options?: { cwd?: string; env?: NodeJS.ProcessEnv; timeoutMs?: number },
) {
  const bin = resolveMontraPath();
  const timeout = options?.timeoutMs ?? 120000; // 2 minutes default
  try {
    const { stdout, stderr } = await pexecFile(bin, args, {
      cwd: options?.cwd,
      env: options?.env,
      timeout,
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout, stderr };
  } catch (error: unknown) {
    let message = "Unknown error";
    if (typeof error === "object" && error) {
      if ("stderr" in error) {
        const stderr = (error as { stderr?: unknown }).stderr;
        if (typeof stderr === "string") message = stderr;
        else if (Buffer.isBuffer(stderr)) message = (stderr as Buffer).toString();
      }
      if (message === "Unknown error" && error instanceof Error) {
        message = error.message;
      }
    } else if (error instanceof Error) {
      message = error.message;
    }
    await showToast({ style: Toast.Style.Failure, title: "Montra command failed", message });
    throw error;
  }
}
export async function runMontraJSON<T = unknown>(args: string[], options?: { timeoutMs?: number }) {
  const { stdout } = await runMontra([...args, "--output", "json"], options);
  try {
    return JSON.parse(stdout) as T;
  } catch (e: unknown) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to parse JSON output",
      message: e instanceof Error ? e.message : undefined,
    });
    throw e;
  }
}

export function envToArg(env: Environment | undefined): string[] {
  return env ? ["-e", env] : [];
}
