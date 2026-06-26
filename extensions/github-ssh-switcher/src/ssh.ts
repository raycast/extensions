/**
 * SSH utilities for the GitHub SSH Switcher.
 *
 * Handles environment resolution, command execution, and the three-step
 * switch flow: clear agent → load key → test authentication.
 */

import { execFile } from "child_process";
import { promisify } from "util";
import { homedir } from "os";
import type { Account } from "./accounts";

// execFile is used instead of exec throughout this module.
// Unlike exec, execFile never spawns a shell: each binary is invoked directly
// with its arguments passed as a string array. This eliminates any risk of
// shell-injection even if key paths or host names contained special characters.
const execFileAsync = promisify(execFile);

// ── Types ──────────────────────────────────────────────────────────────────────

/** Raw output from a process invocation, always resolved (never thrown). */
export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/** A single step in the switch flow with its recorded outcome. */
export interface Step {
  /** Human-readable label shown in the error detail view. */
  title: string;
  /** Whether the step completed successfully. */
  ok: boolean;
  /** Relevant output from the process (stdout or stderr). */
  output: string;
}

// ── Environment ────────────────────────────────────────────────────────────────

/**
 * Builds the execution environment for SSH child processes.
 *
 * Raycast is a sandboxed app and may not inherit the user's full shell
 * environment. Two platform-specific concerns are addressed here:
 *
 * **macOS** — `SSH_AUTH_SOCK` (the UNIX socket for ssh-agent) may be absent.
 * We query `launchctl`, the macOS service manager that registers this
 * variable at login, as a fallback.
 *
 * **Windows** — `SSH_AUTH_SOCK` is not used; the built-in OpenSSH agent
 * communicates via named pipe automatically. The `launchctl` call is skipped.
 *
 * On both platforms we prepend the most common directories for `ssh` and
 * `ssh-add` to PATH so the binaries are always found regardless of the
 * shell configuration Raycast inherited.
 */
export async function resolveEnv(): Promise<NodeJS.ProcessEnv> {
  const isWindows = process.platform === "win32";
  let sshAuthSock = process.env.SSH_AUTH_SOCK;

  // launchctl is macOS-only; skip on Windows to avoid a pointless subprocess.
  if (!sshAuthSock && !isWindows) {
    try {
      const { stdout } = await execFileAsync("launchctl", ["getenv", "SSH_AUTH_SOCK"]);
      const sock = stdout.trim();
      if (sock) sshAuthSock = sock;
    } catch {
      // launchctl unavailable or SSH_AUTH_SOCK not registered.
      // ssh-add will fail later with an explicit error message.
    }
  }

  const sshPaths = isWindows
    ? "C:\\Windows\\System32\\OpenSSH"
    : "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin";

  const pathSep = isWindows ? ";" : ":";
  const resolvedPath = [sshPaths, process.env.PATH].filter(Boolean).join(pathSep);

  return {
    ...process.env,
    PATH: resolvedPath,
    ...(sshAuthSock ? { SSH_AUTH_SOCK: sshAuthSock } : {}),
  };
}

// ── Process execution ──────────────────────────────────────────────────────────

/**
 * Invokes a binary directly (no shell) and always resolves — never rejects.
 *
 * Arguments are passed as a separate array so they are never interpreted by
 * a shell, preventing any possibility of argument injection.
 *
 * Non-zero exit codes and stderr content are captured in the returned object
 * so each caller can decide how to handle failures explicitly.
 */
export async function runCommand(
  binary: string,
  args: string[],
  env: NodeJS.ProcessEnv
): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await execFileAsync(binary, args, { env });
    return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 };
  } catch (error: unknown) {
    const e = error as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: e.stdout?.trim() ?? "",
      stderr: e.stderr?.trim() ?? "",
      exitCode: e.code ?? 1,
    };
  }
}

// ── Switch flow ────────────────────────────────────────────────────────────────

/**
 * Switches the active SSH identity to the given account.
 *
 * Executes three steps in sequence:
 *  1. `ssh-add -D`          — remove all identities from the agent.
 *  2. `ssh-add <keyPath>`   — load the account's private key.
 *  3. `ssh -T <host>`       — verify the connection to GitHub.
 *
 * Each step is appended to `steps` as it completes, even when a later step
 * throws. This lets the caller display partial progress on failure.
 *
 * **Passphrase requirement:** `ssh-add` runs non-interactively (no terminal
 * prompt is available from Raycast). Keys with passphrases must be stored in
 * the macOS Keychain first with:
 *
 *   ssh-add --apple-use-keychain ~/.ssh/your_key
 *
 * @throws {Error} If key loading or GitHub authentication fails.
 */
export async function switchToAccount(
  account: Account,
  steps: Step[],
  env: NodeJS.ProcessEnv
): Promise<void> {
  const keyPath = expandTilde(account.keyPath);

  // ── 1. Clear SSH agent ───────────────────────────────────────────────────
  const clearResult = await runCommand("ssh-add", ["-D"], env);
  // "no identities" is benign — the agent was already empty.
  const noIdentities = clearResult.stderr.toLowerCase().includes("the agent has no identities");
  const clearOk = clearResult.exitCode === 0 || noIdentities;
  steps.push({
    title: "Clear SSH agent  `ssh-add -D`",
    ok: clearOk,
    output: clearResult.stderr || clearResult.stdout || "OK",
  });
  if (!clearOk) {
    throw new Error(
      clearResult.stderr || clearResult.stdout || `ssh-add -D exited with code ${clearResult.exitCode}`
    );
  }

  // ── 2. Load the private key ──────────────────────────────────────────────
  const addResult = await runCommand("ssh-add", [keyPath], env);
  steps.push({
    title: `Load key  \`${keyPath}\``,
    ok: addResult.exitCode === 0,
    output:
      addResult.exitCode === 0
        ? "Identity added"
        : addResult.stderr || addResult.stdout || `exit ${addResult.exitCode}`,
  });

  if (addResult.exitCode !== 0) {
    throw new Error(
      addResult.stderr || addResult.stdout || `ssh-add exited with code ${addResult.exitCode}`
    );
  }

  // ── 3. Test GitHub authentication ────────────────────────────────────────
  // GitHub always exits with code 1 on `ssh -T`, even on success.
  // The real outcome is determined by the content of the response message.
  // `BatchMode=yes` disables interactive prompts so the call never hangs.
  const testResult = await runCommand("ssh", ["-o", "BatchMode=yes", "-T", account.host], env);
  const testOutput = [testResult.stdout, testResult.stderr].filter(Boolean).join("\n").trim();
  const testOk = testOutput.toLowerCase().includes("successfully authenticated");

  steps.push({
    title: `Authenticate with GitHub  \`${account.host}\``,
    ok: testOk,
    output: testOutput || `no response  (exit ${testResult.exitCode})`,
  });

  if (!testOk) {
    throw new Error(testOutput || `ssh -T exited with code ${testResult.exitCode}`);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Replaces a leading `~/` with the current user's home directory. */
function expandTilde(filePath: string): string {
  return filePath.startsWith("~/") ? `${homedir()}${filePath.slice(1)}` : filePath;
}
