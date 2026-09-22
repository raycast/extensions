import { getPreferenceValues, open } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { agent } from "./agents";
import { SessionHit } from "./types";

/**
 * Resuming strategies (see `AGENTS` in agents.ts for the per-agent details):
 *  - desktop apps handle a deep link (`claude://resume?session=<uuid>`, `codex://threads/<uuid>`, …)
 *  - terminal: the agent's own resume invocation, run inside the session's cwd
 * Terminal launchers follow the patterns used by ClaudeCast, claude-code-launcher and
 * heyitaki's search-agent-sessions extension.
 */

type Prefs = Pick<Preferences, "terminalApp" | "defaultResumeTarget">;

function prefs(): Prefs {
  const p = getPreferenceValues<Partial<Prefs>>();
  return {
    terminalApp: p.terminalApp ?? "Terminal",
    defaultResumeTarget: p.defaultResumeTarget ?? "auto",
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
  const d = agent(hit.agent);
  const id = shellQuote(hit.sessionId);
  const p = getPreferenceValues<Record<string, unknown>>();
  const override = d.commandPreference ? p[d.commandPreference] : undefined;
  const command = (typeof override === "string" ? override.trim() : "") || d.command;
  if (command === d.command) {
    // Desktop-first users often have no CLI on PATH: fall back to a known install location.
    const fallback = d.commandFallbacks.find((c) => existsSync(c));
    if (fallback) {
      return `(command -v ${command} >/dev/null 2>&1 && ${d.resume(command, id)} || ${d.resume(shellQuote(fallback), id)})`;
    }
  }
  return d.resume(command, id);
}

/**
 * The file to reveal for a session. Agents that keep every session in one database are indexed
 * as `<database path>#<session id>`, so the database itself is what exists on disk.
 */
export function transcriptPath(hit: SessionHit): string {
  const at = hit.file.lastIndexOf("#");
  return at === -1 ? hit.file : hit.file.slice(0, at);
}

export function fullTerminalCommand(hit: SessionHit): string {
  return `cd ${shellQuote(workingDirectory(hit))} && ${resumeCommand(hit)}`;
}

/** Deep link opening the session in the agent's desktop app, when it has one. */
export function appDeepLink(hit: SessionHit): string | null {
  return agent(hit.agent).app?.deepLink(hit.sessionId) ?? null;
}

export function appName(hit: SessionHit): string | null {
  return agent(hit.agent).app?.name ?? null;
}

export function isDesktopSession(hit: SessionHit): boolean {
  const e = (hit.entrypoint ?? "").toLowerCase();
  return e.includes("desktop") || e === "vscode";
}

/** Which action Enter should trigger for this session. */
export function preferredTarget(hit: SessionHit): "app" | "terminal" {
  if (!agent(hit.agent).app) return "terminal";
  const p = prefs();
  if (p.defaultResumeTarget !== "auto") return p.defaultResumeTarget;
  return isDesktopSession(hit) ? "app" : "terminal";
}

export async function openInApp(hit: SessionHit): Promise<void> {
  const link = appDeepLink(hit);
  if (!link) throw new Error(`${agent(hit.agent).label} has no desktop app to open`);
  await open(link);
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
