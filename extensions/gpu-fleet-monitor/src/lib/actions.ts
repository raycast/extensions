import { exec, execSync, spawn } from "child_process";
import { existsSync } from "fs";
import { SSHHost, TerminalApp, EditorApp } from "./types";

function runAppleScript(script: string): void {
  const child = spawn("osascript", ["-"], {
    stdio: ["pipe", "ignore", "ignore"],
    detached: true,
  });
  child.stdin.write(script);
  child.stdin.end();
  child.unref();
}

// --------------- Terminal backends ---------------

function openInGhostty(cmd: string): void {
  execSync("pbcopy", { input: cmd });

  const script = `
tell application "System Events"
  set isRunning to (count of (every process whose name is "Ghostty")) > 0
end tell

if isRunning then
  tell application "Ghostty" to activate
  delay 0.3
  tell application "System Events" to tell process "Ghostty"
    keystroke "t" using command down
    delay 0.3
    keystroke "v" using command down
    delay 0.1
    keystroke return
  end tell
else
  do shell script "open -a Ghostty"
  delay 1.0
  tell application "System Events" to tell process "Ghostty"
    keystroke "v" using command down
    delay 0.1
    keystroke return
  end tell
end if`;
  runAppleScript(script);
}

function openInITerm(cmd: string): void {
  const safe = cmd.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const script = `
tell application "iTerm"
  activate
  if (count of windows) = 0 then
    create window with default profile command "${safe}"
  else
    tell current window
      create tab with default profile command "${safe}"
    end tell
  end if
end tell`;
  runAppleScript(script);
}

function openInTerminal(cmd: string): void {
  const safe = cmd.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const script = `
tell application "Terminal"
  activate
  do script "${safe}"
end tell`;
  runAppleScript(script);
}

function openInTerminalApp(terminal: TerminalApp, cmd: string): void {
  switch (terminal) {
    case "iterm":
      return openInITerm(cmd);
    case "terminal":
      return openInTerminal(cmd);
    default:
      return openInGhostty(cmd);
  }
}

// --------------- Editor backends ---------------

const EDITOR_BINS: Record<EditorApp, string[]> = {
  cursor: ["/usr/local/bin/cursor", "/opt/homebrew/bin/cursor", "cursor"],
  vscode: ["/usr/local/bin/code", "/opt/homebrew/bin/code", "code"],
};

function findBin(candidates: string[]): string {
  for (const c of candidates) {
    if (c.includes("/") && existsSync(c)) return c;
  }
  return candidates[candidates.length - 1];
}

function openInEditor(editor: EditorApp, host: SSHHost): void {
  const bin = findBin(EDITOR_BINS[editor]);
  exec(
    `"${bin}" --new-window --remote ssh-remote+${host.name}`,
    {
      env: {
        ...process.env,
        PATH: `/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:${process.env.PATH || ""}`,
      },
    },
    (err, _stdout, stderr) => {
      if (err) console.error(`${editor} error:`, err.message);
      if (stderr) console.error(`${editor} stderr:`, stderr);
    },
  );
}

// --------------- Public API ---------------

export function connectTerminal(terminal: TerminalApp, host: SSHHost): void {
  openInTerminalApp(terminal, `ssh ${host.name}`);
}

export function connectTerminalTmux(
  terminal: TerminalApp,
  host: SSHHost,
  session: string,
): void {
  const escaped = session.replace(/'/g, "'\\''");
  openInTerminalApp(
    terminal,
    `ssh -t ${host.name} tmux attach -t '${escaped}'`,
  );
}

export function connectEditor(editor: EditorApp, host: SSHHost): void {
  openInEditor(editor, host);
}

export function sshCommand(host: SSHHost): string {
  return `ssh ${host.name}`;
}

export function sshTmuxCommand(host: SSHHost, session: string): string {
  const escaped = session.replace(/'/g, "'\\''");
  return `ssh -t ${host.name} tmux attach -t '${escaped}'`;
}

export const TERMINAL_LABELS: Record<TerminalApp, string> = {
  ghostty: "Ghostty",
  iterm: "iTerm",
  terminal: "Terminal",
};

export const EDITOR_LABELS: Record<EditorApp, string> = {
  cursor: "Cursor",
  vscode: "VS Code",
};
