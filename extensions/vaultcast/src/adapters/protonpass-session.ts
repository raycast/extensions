import { spawn } from "child_process";

import { CliError, parseJson, runCli } from "../utils/cli";

const SESSION_LOCKED_PATTERN = /session is locked/i;
const PIN_PATTERN = /^\d{6}$/;
const LOCK_CODE_READ_ERROR_PATTERN =
  /reading lock code|prompting for password|device not configured|operation not supported on socket/i;
const UNLOCK_PROMPT_DELAY_MS = 1_000;
const SESSION_FRESH_WINDOW_MS = 60_000;

let sessionFreshUntil = 0;
let sessionProbe: Promise<void> | undefined;

export interface PassCliInfo {
  session_has_lock?: boolean;
  personal_access_token_name?: string;
}

export function isPassCliPatSession(info: PassCliInfo): boolean {
  return Boolean(info.personal_access_token_name?.trim());
}

export function passCliSessionHasLock(info: PassCliInfo): boolean {
  if (isPassCliPatSession(info)) {
    return false;
  }

  return info.session_has_lock === true;
}

export function isValidProtonPassPin(pin: string): boolean {
  return PIN_PATTERN.test(pin.trim());
}

export function isSessionLockedMessage(message: string): boolean {
  return SESSION_LOCKED_PATTERN.test(message);
}

export function isLockCodePromptError(message: string): boolean {
  return LOCK_CODE_READ_ERROR_PATTERN.test(message);
}

export function isWrongPinError(message: string): boolean {
  if (isLockCodePromptError(message)) {
    return false;
  }

  return /SessionLocked/i.test(message) || /unlock.*session/i.test(message);
}

// Each pass-cli process refreshes an expired access token on its own and persists the result,
// without coordinating with other processes. Parallel calls would all redeem the same single-use
// refresh token, and Proton invalidates the session. A single probe call refreshes first;
// calls started while it runs wait for it, then run in parallel on the fresh token.
async function probePassCliSession(binary: string): Promise<void> {
  const startedAt = Date.now();
  try {
    await runCli(binary, ["info", "--output", "json"]);
    sessionFreshUntil = startedAt + SESSION_FRESH_WINDOW_MS;
  } catch {
    // Not logged in or offline: no refresh can race, so callers run and surface their own error.
  }
}

function ensureFreshPassCliSession(binary: string): Promise<void> {
  if (Date.now() < sessionFreshUntil) {
    return Promise.resolve();
  }

  sessionProbe ??= probePassCliSession(binary).finally(() => {
    sessionProbe = undefined;
  });
  return sessionProbe;
}

export async function runPassCliCommand(binary: string, args: string[]): Promise<string> {
  await ensureFreshPassCliSession(binary);
  return runCli(binary, args);
}

export async function getPassCliInfo(binary: string): Promise<PassCliInfo> {
  const stdout = await runPassCliCommand(binary, ["info", "--output", "json"]);
  return parseJson<PassCliInfo>(stdout);
}

export async function isPassCliSessionLocked(binary: string): Promise<boolean> {
  try {
    await runPassCliCommand(binary, ["vault", "list", "--output", "json"]);
    return false;
  } catch (error) {
    const message = error instanceof CliError ? error.message : String(error);
    return isSessionLockedMessage(message);
  }
}

export async function unlockPassCliSession(binary: string, pin: string): Promise<void> {
  const normalizedPin = pin.trim();
  if (!isValidProtonPassPin(normalizedPin)) {
    throw new CliError("PIN muss 6 Ziffern haben.");
  }

  await runUnlockCommand(binary, normalizedPin);

  if (await isPassCliSessionLocked(binary)) {
    throw new CliError("PIN falsch.");
  }
}

async function runUnlockCommand(binary: string, pin: string): Promise<void> {
  if (process.platform === "darwin" || process.platform === "linux") {
    const delaySeconds = UNLOCK_PROMPT_DELAY_MS / 1_000;
    const command =
      process.platform === "darwin"
        ? `(sleep ${delaySeconds}; printf '%s\\n' "$PASS_CLI_PIN") | script -q /dev/null "$PASS_CLI_BIN" session unlock`
        : `(sleep ${delaySeconds}; printf '%s\\n' "$PASS_CLI_PIN") | script -q -c "$PASS_CLI_BIN session unlock" /dev/null`;

    await runShellCommand(command, {
      PASS_CLI_BIN: binary,
      PASS_CLI_PIN: pin,
    });
    return;
  }

  throw new CliError(
    "PIN-Entsperrung ist auf dieser Plattform nicht automatisiert. Führe im Terminal aus: pass-cli session unlock",
  );
}

async function runShellCommand(command: string, env: Record<string, string>, timeoutMs = 30_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("bash", ["-c", command], {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill();
        reject(new CliError(`CLI timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(error);
      }
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);

      if (code !== 0 && !stdout.trim()) {
        reject(
          new CliError(
            stderr.trim() || `CLI exited with code ${code ?? "unknown"}`,
            code === null ? undefined : code,
            stderr,
          ),
        );
        return;
      }

      resolve(stdout.trim());
    });
  });
}
