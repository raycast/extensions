import { ChildProcess, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { access, mkdir, open, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CommandDescriptor, normalizeCliExecutionError } from "./exec";
import { PassCliError } from "../types";

const LOGIN_HOST = "account.proton.me";
const STATE_FILE = "login.json";
/**
 * Each login attempt has its own files, and each process its own exit code: a canceled login may exit after its
 * replacement started, and cleaning up after an attempt must not touch the next one's.
 */
const outputPath = (dir: string, attempt: string) => join(dir, `${attempt}-output.txt`);
const failurePath = (dir: string, attempt: string) => join(dir, `${attempt}-failure.txt`);
const exitCodePath = (dir: string, pid: number) => join(dir, `${pid}-exit-code.txt`);
const POLL_MS = 100;
/** How long a browser login may take; past it, a saved process ID may belong to another process by now. */
export const LOGIN_TIMEOUT_MS = 10 * 60_000;

/** A login running on its own, saved so that the extension finds it again after Raycast stopped it. */
interface SavedLogin {
  pid: number;
  attempt: string;
  startedAt: number;
}

export type BrowserLoginStatus =
  | { state: "none" }
  /** `isFinishing` once the browser login is done and pass-cli is saving the session. */
  | { state: "waiting"; url: string; isFinishing: boolean }
  | { state: "succeeded" }
  | { state: "failed"; error: PassCliError };

/** Logins started by this process, which it can stop safely once they've run too long. */
const ownLogins = new Map<number, ChildProcess>();

export function extractLoginUrl(text: string): string | null {
  for (const candidate of text.match(/https?:\/\/\S+/g) ?? []) {
    try {
      const url = new URL(candidate);
      if (url.protocol === "https:" && url.host === LOGIN_HOST) return candidate;
    } catch {
      // Keep scanning output. Browser opening is best-effort.
    }
  }

  return null;
}

export function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM: the process exists, but can't be signaled.
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function stopProcess(pid: number): void {
  try {
    process.kill(pid);
  } catch {
    // Already gone.
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const readText = (path: string) => readFile(path, "utf8").catch(() => "");
const exists = (path: string) =>
  access(path).then(
    () => true,
    () => false,
  );
/** Complete lines only: the URL may still be being written. */
const urlIn = (output: string) => extractLoginUrl(output.slice(0, output.lastIndexOf("\n") + 1));

async function readSavedLogin(dir: string): Promise<SavedLogin | undefined> {
  try {
    const saved = JSON.parse(await readFile(join(dir, STATE_FILE), "utf8")) as Partial<SavedLogin>;
    const isValid =
      typeof saved.pid === "number" && typeof saved.attempt === "string" && typeof saved.startedAt === "number";
    return isValid ? (saved as SavedLogin) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The output holds the login URL and its payload, so the files go as soon as the login is over. pass-cli's exit code
 * can be written meanwhile, which makes the removal fail as not empty: retried.
 */
const removeLogin = (dir: string) => rm(dir, { recursive: true, force: true, maxRetries: 3 });

/** What pass-cli prints once the browser login is done, before saving the session. */
const FINISHING_LINE = /web authentication complete/i;

/** What pass-cli prints on the way, which explains no failure. */
const PROGRESS_LINE = /^(please open the following url|waiting for authentication|web authentication complete)/i;

/** pass-cli's output without the login URL, its payload, progress lines and email addresses. */
function failureDetails(output: string): string {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/https?:\/\/|payload=/i.test(line) && !PROGRESS_LINE.test(line))
    .map((line) => line.replace(/[^\s@]+@[^\s@]+/g, "<email>"))
    .join("\n");
}

/**
 * Why the login failed, in pass-cli's words, leaving out the login URL, its payload and email addresses. Without any,
 * pass-cli was stopped from outside: it prints an error whenever the login itself fails.
 */
function loginFailure(output: string, cliPath: string): PassCliError {
  const details = failureDetails(output);
  if (!details) return new PassCliError("pass-cli was stopped before the login completed.", "unknown");
  const error = normalizeCliExecutionError(
    Object.assign(new Error("pass-cli login failed"), { stderr: details }),
    cliPath,
  );
  if (error.type === "not_authenticated") return new PassCliError("The login didn't complete. Try again.", error.type);
  if (error.type !== "unknown") return error;
  return new PassCliError(`pass-cli login failed: ${details.replace(/\s+/g, " ").slice(0, 300)}`, "unknown");
}

/**
 * Starts `pass-cli login` on its own, writing to a file in `dir`: Raycast can stop the extension once the browser
 * opens, and the login must still complete. Resolves with the URL to open, as soon as pass-cli prints it.
 */
export async function startDetachedLogin(
  command: CommandDescriptor,
  dir: string,
  urlTimeoutMs: number,
): Promise<string> {
  // A login still running from before would compete with this one.
  await cancelDetachedLogin(dir);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const attempt = randomUUID();
  const output = await open(outputPath(dir, attempt), "w", 0o600);
  let child: ChildProcess;
  try {
    child = spawn(command.file, [...command.args, "login"], {
      detached: true,
      stdio: ["ignore", output.fd, output.fd],
      windowsHide: true,
    });
    await once(child, "spawn");
  } catch (error) {
    await removeLogin(dir);
    throw normalizeCliExecutionError(error, command.file);
  } finally {
    await output.close();
  }

  child.unref();
  const pid = child.pid as number;
  ownLogins.set(pid, child);
  // The exit code tells success from failure, if the extension is still running when pass-cli exits. A signal, in
  // its place, tells that something stopped pass-cli.
  child.once("exit", (code, signal) => {
    ownLogins.delete(pid);
    void writeFile(exitCodePath(dir, pid), String(code ?? signal)).catch(() => undefined);
  });

  const startedAt = Date.now();
  // Saved from the start, so that no other pass-cli command runs meanwhile (see isDetachedLoginRunning).
  const saved = { pid, attempt, startedAt } satisfies SavedLogin;
  await writeFile(join(dir, STATE_FILE), JSON.stringify(saved), { mode: 0o600 });
  while (true) {
    const text = await readText(outputPath(dir, attempt));
    const url = urlIn(text);
    if (url) return url;
    const hasTimedOut = Date.now() - startedAt > urlTimeoutMs;
    if (hasTimedOut || !isProcessRunning(pid)) {
      if (hasTimedOut) child.kill();
      await removeLogin(dir);
      throw hasTimedOut
        ? new PassCliError("pass-cli didn't start the login. Try again.", "timeout")
        : loginFailure(text, command.file);
    }
    await sleep(POLL_MS);
  }
}

/**
 * Where the login started by startDetachedLogin is. Once pass-cli has exited, its exit code, or else whether a session
 * exists, tells success from failure, and the login's files are removed. A login older than `timeoutMs` has failed if
 * it's still running, and is forgotten otherwise.
 */
export async function checkDetachedLogin(
  dir: string,
  isLoggedIn: () => Promise<boolean>,
  timeoutMs = LOGIN_TIMEOUT_MS,
): Promise<BrowserLoginStatus> {
  const saved = await readSavedLogin(dir);
  if (!saved) return { state: "none" };

  // Once the output is gone, pass-cli has exited (see forgetLoginUrl), even if its process ID is in use again.
  const isOver = !(await exists(outputPath(dir, saved.attempt)));
  const isRunning = !isOver && isProcessRunning(saved.pid);
  const hasTimedOut = Date.now() - saved.startedAt > timeoutMs;
  if (isRunning && !hasTimedOut) {
    const output = await readText(outputPath(dir, saved.attempt));
    return { state: "waiting", url: urlIn(output) ?? "", isFinishing: FINISHING_LINE.test(output) };
  }

  const [output, failure, exitCode] = await Promise.all([
    readText(outputPath(dir, saved.attempt)),
    readText(failurePath(dir, saved.attempt)),
    readText(exitCodePath(dir, saved.pid)).then((text) => text.trim()),
  ]);
  await removeLogin(dir);
  if (hasTimedOut) {
    if (!isRunning) return { state: "none" };
    // After this long, only a process started here is surely still pass-cli.
    ownLogins.get(saved.pid)?.kill();
    return { state: "failed", error: new PassCliError("The login timed out. Try again.", "timeout") };
  }
  if (isOver) {
    // The login ended a while ago, and its session may have ended since, e.g. with Logout: the session tells. A
    // failure shows only with pass-cli's reason, which forgetLoginUrl kept.
    if (await isLoggedIn()) return { state: "succeeded" };
    return failure ? { state: "failed", error: loginFailure(failure, "pass-cli") } : { state: "none" };
  }
  if (/^SIG/.test(exitCode)) {
    const error = new PassCliError(`pass-cli was stopped (${exitCode}) before the login completed.`, "unknown");
    return { state: "failed", error };
  }
  const hasSucceeded = exitCode ? exitCode === "0" : await isLoggedIn();
  return hasSucceeded ? { state: "succeeded" } : { state: "failed", error: loginFailure(output, "pass-cli") };
}

/**
 * Whether the login started by startDetachedLogin is still running. No other pass-cli command may run meanwhile: one
 * starting while the login saves the new session can find its data without its key yet, and pass-cli then logs out
 * "for security", deleting the session being saved.
 */
export async function isDetachedLoginRunning(dir: string, timeoutMs = LOGIN_TIMEOUT_MS): Promise<boolean> {
  const saved = await readSavedLogin(dir);
  if (!saved || !(await exists(outputPath(dir, saved.attempt)))) return false;
  if (isProcessRunning(saved.pid)) return Date.now() - saved.startedAt <= timeoutMs;
  await forgetLoginUrl(dir, saved);
  return false;
}

/**
 * Once pass-cli has exited, the login's files wait for a login screen to read the result (see checkDetachedLogin),
 * but none shows once logged in: the output, which holds the login URL, goes now. Why a login failed stays for the
 * login screen, since a missing exit code, when Raycast closed first, doesn't mean success. Only this attempt's files
 * change, so a login started meanwhile keeps its own. Exported for tests.
 */
export async function forgetLoginUrl(dir: string, saved: SavedLogin): Promise<void> {
  const output = outputPath(dir, saved.attempt);
  try {
    const [text, exitCode] = await Promise.all([readText(output), readText(exitCodePath(dir, saved.pid))]);
    const failure = exitCode.trim() === "0" ? "" : failureDetails(text);
    // Written first, so that a login screen reading meanwhile finds either the output or why the login failed. Only
    // when there's a reason: a cleanup overlapping another can read the output after the other removed it.
    if (failure) await writeFile(failurePath(dir, saved.attempt), failure, { mode: 0o600 });
    await rm(output, { force: true });
  } catch {
    // A login screen or a new login removed the folder meanwhile.
  }
}

/** Stops the login started by startDetachedLogin, if it's still running, and removes its files. */
export async function cancelDetachedLogin(dir: string, timeoutMs = LOGIN_TIMEOUT_MS): Promise<void> {
  const saved = await readSavedLogin(dir);
  if (saved && Date.now() - saved.startedAt <= timeoutMs && isProcessRunning(saved.pid)) stopProcess(saved.pid);
  await removeLogin(dir);
}
