import {
  Action,
  ActionPanel,
  Clipboard,
  getPreferenceValues,
  Icon,
  showInFinder,
  showToast,
  Toast,
} from "@raycast/api";
import { exec, execFile } from "child_process";
import { wslUncPath } from "./providers/wsl";
import type { SessionInfo } from "./types";

interface Preferences {
  terminal: string;
  ide: string;
}

const isMac = process.platform === "darwin";

const MAC_ONLY_TERMINALS = new Set(["terminal", "iterm", "ghostty", "kitty"]);
const WIN_ONLY_TERMINALS = new Set(["wt", "powershell", "cmd"]);

export function resolveTerminal(pref: string): string {
  if (pref === "default") return isMac ? "terminal" : "wt";

  if (isMac && WIN_ONLY_TERMINALS.has(pref)) {
    showToast({ style: Toast.Style.Failure, title: `${pref} is not available on macOS, using Terminal.app` });
    return "terminal";
  }
  if (!isMac && MAC_ONLY_TERMINALS.has(pref)) {
    showToast({ style: Toast.Style.Failure, title: `${pref} is not available on Windows, using Windows Terminal` });
    return "wt";
  }

  return pref;
}

const IDE_APPS: Record<string, { name: string; cmd: string }> = {
  vscode: { name: "Visual Studio Code", cmd: "code" },
  cursor: { name: "Cursor", cmd: "cursor" },
  zed: { name: "Zed", cmd: "zed" },
  webstorm: { name: "WebStorm", cmd: "webstorm" },
  intellij: { name: "IntelliJ IDEA", cmd: "idea" },
};

function toastOnError(label: string) {
  return (error: Error | null) => {
    if (error) {
      showToast({ style: Toast.Style.Failure, title: `Failed to open ${label}`, message: error.message });
    }
  };
}

export function escapeShellArg(s: string): string {
  if (isMac) {
    return `'${s.replace(/'/g, "'\\''")}'`;
  }
  return `"${s.replace(/"/g, '\\"')}"`;
}

export function bashCommand(dir: string, resumeCmd: string): string {
  const escapedDir = dir.replace(/'/g, "'\\''");
  return `export PATH="$HOME/.local/bin:$PATH" && cd '${escapedDir}' && ${resumeCmd}`;
}

function macAppleScriptLaunch(appName: string, session: SessionInfo, resumeCmd: string) {
  const cmd = bashCommand(session.projectPath, resumeCmd);
  const script = `tell application "${appName}"
  activate
  do script "${cmd.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"
end tell`;
  execFile("osascript", ["-e", script], toastOnError(appName));
}

function sessionUncPath(session: SessionInfo): string {
  return wslUncPath(session.wslDistro!, session.projectPath);
}

function openInTerminal(session: SessionInfo, resumeCmd: string) {
  const prefs = getPreferenceValues<Preferences>();
  const terminal = resolveTerminal(prefs.terminal ?? "default");
  const dir = session.projectPath;
  const bashCmd = bashCommand(dir, resumeCmd);

  if (isMac) {
    switch (terminal) {
      case "terminal":
      case "iterm":
      case "warp":
        macAppleScriptLaunch(
          terminal === "terminal" ? "Terminal" : terminal === "iterm" ? "iTerm" : "Warp",
          session,
          resumeCmd,
        );
        return;
      case "ghostty":
        execFile(
          "/Applications/Ghostty.app/Contents/MacOS/ghostty",
          ["-e", "/bin/bash", "-lc", bashCmd],
          toastOnError("Ghostty"),
        );
        return;
      case "kitty":
        execFile(
          "kitty",
          ["--single-instance", "--directory", dir, "/bin/bash", "-lc", bashCmd],
          toastOnError("Kitty"),
        );
        return;
      case "alacritty":
        execFile(
          "alacritty",
          ["--working-directory", dir, "-e", "/bin/bash", "-lc", bashCmd],
          toastOnError("Alacritty"),
        );
        return;
      case "wezterm":
        execFile("wezterm", ["start", "--cwd", dir, "--", "/bin/bash", "-lc", bashCmd], toastOnError("WezTerm"));
        return;
    }
  } else {
    // Windows: for WSL sessions resumeCmd already contains the full `wsl -d ...` command,
    // so no working-directory flag is needed. For native sessions, set the working directory.
    const winDir = session.wslDistro ? null : dir.replace(/\//g, "\\");
    switch (terminal) {
      case "wt":
        exec(
          winDir ? `wt.exe -d ${escapeShellArg(winDir)} cmd /k "${resumeCmd}"` : `wt.exe cmd /k "${resumeCmd}"`,
          toastOnError("Windows Terminal"),
        );
        return;
      case "powershell":
        exec(
          winDir
            ? `start powershell -NoExit -Command "Set-Location ${escapeShellArg(winDir)}; ${resumeCmd}"`
            : `start powershell -NoExit -Command "${resumeCmd}"`,
          toastOnError("PowerShell"),
        );
        return;
      case "cmd":
        exec(
          winDir ? `start cmd /k "cd /d ${winDir} && ${resumeCmd}"` : `start cmd /k "${resumeCmd}"`,
          toastOnError("Command Prompt"),
        );
        return;
      case "warp":
        exec(
          winDir
            ? `warp-terminal.exe --working-directory ${escapeShellArg(winDir)} -e cmd /k "${resumeCmd}"`
            : `warp-terminal.exe -e cmd /k "${resumeCmd}"`,
          toastOnError("Warp"),
        );
        return;
      case "alacritty":
        exec(
          winDir
            ? `alacritty --working-directory ${escapeShellArg(winDir)} -e cmd /k "${resumeCmd}"`
            : `alacritty -e cmd /k "${resumeCmd}"`,
          toastOnError("Alacritty"),
        );
        return;
      case "wezterm":
        exec(
          winDir
            ? `wezterm start --cwd ${escapeShellArg(winDir)} -- cmd /k "${resumeCmd}"`
            : `wezterm start -- cmd /k "${resumeCmd}"`,
          toastOnError("WezTerm"),
        );
        return;
    }
  }
}

function openInIDE(session: SessionInfo) {
  const prefs = getPreferenceValues<Preferences>();
  const ide = IDE_APPS[prefs.ide] ?? IDE_APPS.vscode;

  if (isMac) {
    execFile("open", ["-a", ide.name, session.projectPath], toastOnError(ide.name));
  } else if (session.wslDistro) {
    exec(`${ide.cmd} --remote wsl+${session.wslDistro} ${escapeShellArg(session.projectPath)}`, toastOnError(ide.name));
  } else {
    exec(`${ide.cmd} ${escapeShellArg(session.projectPath.replace(/\//g, "\\"))}`, toastOnError(ide.name));
  }
}

export function SessionActions({ session, resumeCommand }: { session: SessionInfo; resumeCommand: string }) {
  return (
    <ActionPanel>
      <Action title="Open in Terminal" icon={Icon.Terminal} onAction={() => openInTerminal(session, resumeCommand)} />
      <Action
        title="Copy Session ID"
        icon={Icon.Clipboard}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        onAction={() => {
          Clipboard.copy(session.sessionId);
          showToast({ style: Toast.Style.Success, title: "Session ID copied" });
        }}
      />
      <Action
        title="Open in File Explorer"
        icon={Icon.Finder}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
        onAction={() => showInFinder(session.wslDistro ? sessionUncPath(session) : session.projectPath)}
      />
      <Action
        title="Open in IDE"
        icon={Icon.Code}
        shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
        onAction={() => openInIDE(session)}
      />
    </ActionPanel>
  );
}
