import { environment, getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { HelperError, MenuBarItem, MenuBarItemHint } from "./menu-bar-types";

const execFileAsync = promisify(execFile);
const DEFAULT_TIMEOUT_MS = 8000;

export function useHelperPath() {
  const preferences = getPreferenceValues<Preferences.Index>();
  if (preferences.helperPath?.trim()) {
    return preferences.helperPath.trim();
  }

  return path.join(environment.assetsPath, "menubarctl");
}

export async function listMenuBarItems(helperPath: string) {
  await ensureHelperExists(helperPath);
  return runHelper<MenuBarItem[]>(helperPath, ["list"]);
}

export async function openMenuBarItem(
  helperPath: string,
  id: string,
  hint: MenuBarItemHint,
) {
  await runHelper(helperPath, ["open", id, JSON.stringify(hint)]);
}

export async function getMenuBarItemDebugInfo(
  helperPath: string,
  id: string,
  hint: MenuBarItemHint,
) {
  return runHelper<unknown>(helperPath, ["debug", id, JSON.stringify(hint)]);
}

export async function getLastOpenTrace(helperPath: string) {
  return runHelper<unknown>(helperPath, ["last-open-trace"]);
}

export function normalizeError(error: unknown): HelperError {
  if (typeof error === "object" && error !== null) {
    const helperError = error as HelperError;
    if (
      helperError.message ||
      helperError.code ||
      helperError.recoverySuggestion
    ) {
      return helperError;
    }
  }

  if (error instanceof Error) {
    return {
      code: "unknown_error",
      message: error.message,
    };
  }

  return {
    code: "unknown_error",
    message: "Unknown error",
  };
}

async function ensureHelperExists(helperPath: string) {
  try {
    await access(helperPath);
  } catch {
    throw {
      code: "helper_missing",
      message: "Swift helper is not built",
      recoverySuggestion:
        "Run `npm run build-helper`, then reload the Raycast extension.",
    };
  }
}

async function runHelper<T>(helperPath: string, args: string[]): Promise<T> {
  try {
    const { stdout } = await execFileAsync(helperPath, args, {
      timeout: DEFAULT_TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
    });
    return JSON.parse(stdout) as T;
  } catch (caughtError) {
    const error = caughtError as Error & {
      stdout?: string;
      stderr?: string;
      killed?: boolean;
      signal?: string;
    };

    const stdoutError = parseHelperError(error.stdout);
    if (stdoutError) {
      throw stdoutError;
    }

    const stderrError = parseHelperError(error.stderr);
    if (stderrError) {
      throw stderrError;
    }

    if (error.stderr) {
      throw {
        code: "helper_error",
        message: error.stderr.trim(),
      };
    }

    if (error.killed || error.signal === "SIGTERM") {
      throw {
        code: "helper_timeout",
        message: "The helper timed out",
        recoverySuggestion:
          "Try refreshing. If this repeats, a target app may be slow to answer Accessibility queries.",
      };
    }

    throw error;
  }
}

function parseHelperError(output?: string): HelperError | undefined {
  if (!output?.trim()) return undefined;

  try {
    const parsed = JSON.parse(output) as HelperError;
    return parsed.message || parsed.code || parsed.recoverySuggestion
      ? parsed
      : undefined;
  } catch {
    return undefined;
  }
}
