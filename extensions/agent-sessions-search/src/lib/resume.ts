import { getPreferenceValues, open } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { SessionHit } from "./types";

/**
 * Resuming strategies (verified against the installed apps):
 *  - Claude Desktop handles `claude://resume?session=<uuid>` (imports a CLI session if needed).
 *  - Codex (ChatGPT.app, bundle com.openai.codex) handles `codex://threads/<uuid>`.
 *  - Terminal: `claude --resume <id>` / `codex resume <id>` run inside the session's cwd.
 * Terminal launchers follow the patterns used by ClaudeCast, claude-code-launcher and
 * heyitaki's search-agent-sessions extension.
 */

interface Prefs {
  terminalApp: "Terminal" | "iTerm" | "Ghostty" | "Warp";
  defaultResumeTarget: "auto" | "app" | "terminal";
  claudeCommand: string;
  codexCommand: string;
}

export const CODEX_BUNDLED_CLI = "/Applications/ChatGPT.app/Contents/Resources/codex";

function prefs(): Prefs {
  const p = getPreferenceValues<Partial<Prefs>>();
  return {
    terminalApp: p.terminalApp ?? "Terminal",
    defaultResumeTarget: p.defaultResumeTarget ?? "auto",
    claudeCommand: p.claudeCommand?.trim() || "claude",
    codexCommand: p.codexCommand?.trim() || "codex",
  };
}

export function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

export function workingDirectory(hit: SessionHit): string {
  for (const dir of [hit.cwd, hit.repoRoot]) if (dir && existsSync(dir)) return dir;
  return homedir();
}

export function resumeCommand(hit: SessionHit): string {
  const p = prefs();
  const id = shellQuote(hit.sessionId);
  if (hit.agent === "claude") return `${p.claudeCommand} --resume ${id}`;
  if (p.codexCommand === "codex" && existsSync(CODEX_BUNDLED_CLI)) {
    // Codex desktop users often have no `codex` on PATH; fall back to the CLI bundled with the app.
    return `(command -v codex >/dev/null 2>&1 && codex resume ${id} || ${shellQuote(CODEX_BUNDLED_CLI)} resume ${id})`;
  }
  return `${p.codexCommand} resume ${id}`;
}

export function fullTerminalCommand(hit: SessionHit): string {
  return `cd ${shellQuote(workingDirectory(hit))} && ${resumeCommand(hit)}`;
}

export function appDeepLink(hit: SessionHit): string {
  return hit.agent === "claude"
    ? `claude://resume?session=${encodeURIComponent(hit.sessionId)}`
    : `codex://threads/${encodeURIComponent(hit.sessionId)}`;
}

export function appName(hit: SessionHit): string {
  return hit.agent === "claude" ? "Claude Desktop" : "Codex app";
}

export function isDesktopSession(hit: SessionHit): boolean {
  const e = (hit.entrypoint ?? "").toLowerCase();
  return e.includes("desktop") || e === "vscode";
}

/** Which action Enter should trigger for this session. */
export function preferredTarget(hit: SessionHit): "app" | "terminal" {
  const p = prefs();
  if (p.defaultResumeTarget !== "auto") return p.defaultResumeTarget;
  return isDesktopSession(hit) ? "app" : "terminal";
}

export async function openInApp(hit: SessionHit): Promise<void> {
  await open(appDeepLink(hit));
}

export async function openInTerminal(hit: SessionHit): Promise<void> {
  const command = fullTerminalCommand(hit);
  const app = prefs().terminalApp;
  switch (app) {
    case "iTerm":
      await runAppleScript(
        `on run argv
           set cmd to item 1 of argv
           tell application "iTerm"
             activate
             set w to (create window with default profile)
             tell current session of w to write text cmd
           end tell
         end run`,
        [command],
      );
      return;
    case "Ghostty": {
      // Ghostty has no scripting API for injecting text into an existing window: start a new
      // instance running a login shell that execs into an interactive shell afterwards.
      const shell = process.env.SHELL || "/bin/zsh";
      const inner = `${command}; exec ${shellQuote(shell)} -l`;
      await runAppleScript(
        `on run argv
           do shell script "open -na Ghostty.app --args -e " & quoted form of item 1 of argv & " -lc " & quoted form of item 2 of argv
         end run`,
        [shell, inner],
      );
      return;
    }
    case "Warp": {
      const dir = join(homedir(), ".warp", "launch_configurations");
      mkdirSync(dir, { recursive: true });
      const name = `agent-session-${hit.agent}-${hit.sessionId.slice(0, 8)}`;
      const yaml = `---\nname: ${name}\nwindows:\n  - tabs:\n      - layout:\n          cwd: ${JSON.stringify(workingDirectory(hit))}\n          commands:\n            - exec: ${JSON.stringify(resumeCommand(hit))}\n`;
      writeFileSync(join(dir, `${name}.yaml`), yaml);
      await open(`warp://launch/${name}`);
      return;
    }
    default:
      await runAppleScript(
        `on run argv
           set cmd to item 1 of argv
           tell application "Terminal"
             activate
             do script cmd
           end tell
         end run`,
        [command],
      );
  }
}
