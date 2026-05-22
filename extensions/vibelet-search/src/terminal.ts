import { execFile } from "child_process";
import { getPreferenceValues } from "@raycast/api";
import type { SessionMeta, SessionSource } from "./types";

interface Prefs {
  defaultTerminal: string;
  claudeBinary: string;
  codexBinary: string;
}

function getPrefs(): Prefs {
  const p = getPreferenceValues<Partial<Prefs>>();
  return {
    defaultTerminal: p.defaultTerminal || "Terminal",
    claudeBinary: p.claudeBinary || "claude",
    codexBinary: p.codexBinary || "codex",
  };
}

function getUserShell(): string {
  return process.env.SHELL || "/bin/zsh";
}

export interface ResumeCommandOpts {
  /**
   * Prepend `cd <projectPath> && ` so the command works when pasted into a shell from
   * any cwd. Defaults to true — Claude CLI's `--resume <id>` only finds the session when
   * run from the original project directory.
   */
  withCwd?: boolean;
  /**
   * Add the per-CLI "skip all permission prompts" flag.
   * - Claude: `--dangerously-skip-permissions`
   * - Codex:  `--dangerously-bypass-approvals-and-sandbox`
   */
  skipPermissions?: boolean;
}

/**
 * Build the resume command string for a session — what the user would type into a shell.
 * App-sourced sessions still resume via CLI: the conversation jsonl is shared with the CLI,
 * and the CLIs accept the same session id.
 */
export function getResumeCommand(meta: SessionMeta, prefs: Prefs = getPrefs(), opts: ResumeCommandOpts = {}): string {
  const { withCwd = true, skipPermissions = false } = opts;

  let cmd: string;
  if (sourceFamily(meta.source) === "claude") {
    cmd = `${prefs.claudeBinary} --resume ${meta.id}`;
    if (skipPermissions) cmd += " --dangerously-skip-permissions";
  } else {
    cmd = `${prefs.codexBinary} resume ${meta.id}`;
    if (skipPermissions) cmd += " --dangerously-bypass-approvals-and-sandbox";
  }

  if (withCwd && meta.projectPath) {
    cmd = `cd ${shellQuote(meta.projectPath)} && ${cmd}`;
  }
  return cmd;
}

export function sourceFamily(source: SessionSource): "claude" | "codex" {
  return source === "claude-cli" || source === "claude-app" ? "claude" : "codex";
}

/**
 * Open the conversation in the corresponding native app (Claude.app or Codex.app).
 * We just bring the app to the front — neither app currently exposes a documented URL
 * scheme to jump to a specific session id. The user lands in the app and selects the
 * session from its recent list.
 */
export async function openInApp(meta: SessionMeta): Promise<void> {
  const appName = sourceFamily(meta.source) === "claude" ? "Claude" : "Codex";
  await runProcess("/usr/bin/open", ["-a", appName]);
}

/**
 * Build a full shell command line: cd to project, then run resume.
 * Used by terminal apps that send a single string into an interactive shell.
 */
function buildFullResumeShellCommand(meta: SessionMeta, prefs: Prefs): string {
  return getResumeCommand(meta, prefs, { withCwd: true });
}

function shellQuote(s: string): string {
  if (/^[A-Za-z0-9_\-./]+$/.test(s)) return s;
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

function escapeAppleScript(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Open the resume command in the user's configured terminal app.
 * Each branch picks the most native invocation for that terminal so we don't fight with
 * input methods, security prompts, or shell rc loading order.
 */
export async function openResumeInTerminal(meta: SessionMeta): Promise<void> {
  const prefs = getPrefs();
  const fullCmd = buildFullResumeShellCommand(meta, prefs);

  switch (prefs.defaultTerminal) {
    case "Terminal":
      // Avoid the "empty window + command window" race on first launch by checking
      // whether Terminal.app is already running before activating.
      await runAppleScript(
        `set wasRunning to application "Terminal" is running
tell application "Terminal"
  if wasRunning then
    do script "${escapeAppleScript(fullCmd)}"
  else
    activate
    delay 0.3
    do script "${escapeAppleScript(fullCmd)}" in front window
  end if
  activate
end tell`,
      );
      break;

    case "iTerm":
      await runAppleScript(
        `set wasRunning to application "iTerm" is running
tell application "iTerm"
  activate
  if wasRunning then
    if (count of windows) = 0 then
      create window with default profile
    else
      tell current window
        create tab with default profile
      end tell
    end if
  else
    delay 0.3
  end if
  tell current session of current window
    write text "${escapeAppleScript(fullCmd)}"
  end tell
end tell`,
      );
      break;

    case "Ghostty": {
      // Ghostty wraps --initial-command as `bash --noprofile --norc -c "exec -l <cmd>"`,
      // which loses the user's PATH because no rc files are sourced. Re-exec into an interactive
      // shell so ~/.zshrc (where nvm/claude/codex live) is loaded before running the resume command.
      // No need to cd — Ghostty's --working-directory already moves us there.
      const initialCmd = `${getUserShell()} -ic ${shellQuote(getResumeCommand(meta, prefs, { withCwd: false }))}`;
      await runProcess("/usr/bin/open", [
        "-na",
        "Ghostty.app",
        "--args",
        `--working-directory=${meta.projectPath}`,
        `--initial-command=${initialCmd}`,
      ]);
      break;
    }

    case "WezTerm":
      // WezTerm's --cwd already handles the cd.
      await runProcess("/usr/bin/open", [
        "-na",
        "WezTerm.app",
        "--args",
        "start",
        "--cwd",
        meta.projectPath,
        "--",
        getUserShell(),
        "-ic",
        getResumeCommand(meta, prefs, { withCwd: false }),
      ]);
      break;

    case "Warp":
      // Warp has no native CLI for passing commands; just open the project directory and
      // let the user paste the resume command (available via the Copy Resume Command action).
      await runProcess("/usr/bin/open", ["-a", "Warp", meta.projectPath]);
      break;

    default:
      await runAppleScript(
        `tell application "Terminal"
  activate
  do script "${escapeAppleScript(fullCmd)}"
end tell`,
      );
  }
}

/**
 * Spawn an external process and reject with a useful error if it exits non-zero.
 * Captures both stdout and stderr so failure messages aren't swallowed.
 */
function runProcess(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, (err, stdout, stderr) => {
      if (!err) return resolve();
      const parts: string[] = [];
      if (stdout?.trim()) parts.push(`stdout: ${stdout.trim()}`);
      if (stderr?.trim()) parts.push(`stderr: ${stderr.trim()}`);
      reject(new Error(parts.length ? parts.join(" | ") : err.message));
    });
  });
}

function runAppleScript(script: string): Promise<void> {
  return runProcess("/usr/bin/osascript", ["-e", script]);
}
