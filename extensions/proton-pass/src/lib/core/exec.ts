import { execFile } from "node:child_process";
import { PassCliError, PassCliErrorType } from "../types";

export interface CommandDescriptor {
  file: string;
  args: readonly string[];
}

export interface ExecCliOptions {
  env?: NodeJS.ProcessEnv;
  timeout?: number;
  maxBuffer?: number;
}

export interface CliExecution {
  stdout: string;
  stderr: string;
}

export function classifyCliError(text: string): PassCliErrorType {
  const normalized = text.toLowerCase();

  if (normalized.includes("cannot get the encryption key") || normalized.includes("error creating client features")) {
    return "keyring_error";
  }
  if (
    normalized.includes("requires an authenticated client") ||
    normalized.includes("not authenticated") ||
    normalized.includes("login required") ||
    normalized.includes("please login") ||
    normalized.includes("not logged in")
  ) {
    return "not_authenticated";
  }
  if (
    normalized.includes("network") ||
    normalized.includes("timeout") ||
    normalized.includes("timed out") ||
    normalized.includes("connection") ||
    normalized.includes("dns")
  ) {
    return "network_error";
  }
  return "unknown";
}

export function execCli(
  command: CommandDescriptor,
  args: readonly string[],
  options: ExecCliOptions = {},
): Promise<CliExecution> {
  return new Promise((resolve, reject) => {
    execFile(
      command.file,
      [...command.args, ...args],
      {
        env: options.env,
        timeout: options.timeout ?? 60_000,
        maxBuffer: options.maxBuffer ?? 20 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          Object.assign(error, { stdout, stderr });
          reject(error);
          return;
        }
        resolve({ stdout: stdout ?? "", stderr: stderr ?? "" });
      },
    );
  });
}

export function normalizeCliExecutionError(
  error: unknown,
  cliPath: string,
  timeoutMessage = "pass-cli timed out. Please try again.",
): PassCliError {
  const execError = error as NodeJS.ErrnoException & { killed?: boolean; signal?: string; stderr?: string };
  if (execError?.killed && typeof execError.signal === "string") {
    return new PassCliError(timeoutMessage, "timeout");
  }
  if (execError?.code === "ENOENT" || execError?.errno === -2) {
    return new PassCliError(
      `pass-cli not found at '${cliPath}'. Install it or set the correct path in extension preferences.`,
      "not_installed",
    );
  }

  const message = error instanceof Error ? error.message : "";
  const stderr = typeof execError?.stderr === "string" ? execError.stderr : "";
  const combined = [stderr, message]
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n");
  const type = classifyCliError(combined);

  if (type === "keyring_error") {
    return new PassCliError(
      "pass-cli could not access secure key storage. Try: pass-cli logout --force, then set PROTON_PASS_KEY_PROVIDER=fs and login again.",
      type,
    );
  }
  if (type === "not_authenticated") {
    return new PassCliError("Not authenticated. Run pass-cli login to authenticate.", type);
  }
  if (type === "network_error") {
    return new PassCliError("Network error. Check your connection and try again.", type);
  }

  const safeDetails = combined || "An unknown error occurred while running pass-cli.";
  return new PassCliError(
    safeDetails.length > 600 ? `${safeDetails.slice(0, 299)}…${safeDetails.slice(-300)}` : safeDetails,
    "unknown",
  );
}
