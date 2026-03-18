import {
  closeMainWindow,
  getPreferenceValues,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const JUST_CANDIDATES = [
  process.env.HOMEBREW_PREFIX
    ? `${process.env.HOMEBREW_PREFIX}/bin/just`
    : undefined,
  "/opt/homebrew/bin/just",
  "/usr/local/bin/just",
  "/opt/local/bin/just",
].filter((candidate): candidate is string => Boolean(candidate));

export type WorkspaceStatus =
  | { ok: true; gliteRoot: string }
  | { ok: false; errorTitle: string; errorMessage: string };

type Preferences = {
  gliteRoot?: string;
};

function getGliteRoot() {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.gliteRoot?.trim() || "";
}

function shellQuote(value: string) {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

async function getJustExecutable() {
  for (const candidate of JUST_CANDIDATES) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  try {
    const { stdout } = await execFileAsync(
      "/bin/zsh",
      ["-lc", "command -v just"],
      {
        env: process.env,
      },
    );
    const resolvedPath = stdout.trim();

    if (resolvedPath) {
      return resolvedPath;
    }
  } catch {
    // Fall through to the explicit error below.
  }

  throw new Error(
    "Could not find `just`. Install it or make sure it is available at a standard path like /opt/homebrew/bin/just.",
  );
}

function formatCommandError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return "Unknown error";
  }

  const stderr =
    "stderr" in error && typeof error.stderr === "string"
      ? error.stderr.trim()
      : "";
  if (stderr) {
    return stderr;
  }

  const stdout =
    "stdout" in error && typeof error.stdout === "string"
      ? error.stdout.trim()
      : "";
  if (stdout) {
    return stdout;
  }

  if ("message" in error && typeof error.message === "string") {
    return error.message;
  }

  return "Unknown error";
}

async function showFailureToast(title: string, message: string) {
  await showToast({
    style: Toast.Style.Failure,
    title,
    message,
  });
}

export function getWorkspaceStatus(): WorkspaceStatus {
  const gliteRoot = getGliteRoot();

  if (!gliteRoot) {
    return {
      ok: false,
      errorTitle: "Glite Root not set",
      errorMessage: "Set the command preference before using Glite Just.",
    };
  }

  if (!existsSync(gliteRoot)) {
    return {
      ok: false,
      errorTitle: "Glite Root not found",
      errorMessage: gliteRoot,
    };
  }

  return { ok: true, gliteRoot };
}

export async function runJustCommand(commandText?: string) {
  const trimmedCommand = commandText?.trim() || "";
  const workspaceStatus = getWorkspaceStatus();

  if (!trimmedCommand) {
    await showFailureToast(
      "Missing just command",
      "Provide a recipe like `ios` or `lint`.",
    );
    return;
  }

  if (!workspaceStatus.ok) {
    await showFailureToast(
      workspaceStatus.errorTitle,
      workspaceStatus.errorMessage,
    );
    return;
  }

  await closeMainWindow({ clearRootSearch: true });

  try {
    const justExecutable = await getJustExecutable();
    const command = `${shellQuote(justExecutable)} ${trimmedCommand}`;

    await execFileAsync("/bin/zsh", ["-lc", command], {
      cwd: workspaceStatus.gliteRoot,
      env: process.env,
    });

    await showHUD(`Ran just ${trimmedCommand}`, {
      clearRootSearch: true,
    });
  } catch (error) {
    await showFailureToast(
      `just ${trimmedCommand} failed`,
      formatCommandError(error),
    );
  }
}

export async function openUrl(url: string, successTitle: string) {
  await closeMainWindow({ clearRootSearch: true });

  try {
    await execFileAsync("open", [url]);
    await showHUD(successTitle, { clearRootSearch: true });
  } catch (error) {
    await showFailureToast("Failed to open link", formatCommandError(error));
  }
}
