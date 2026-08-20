import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { readFileSync, unlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import type { ShellApp, TerminalKind } from "./types";

const WINDIR = process.env.SystemRoot || process.env.WINDIR || "C:\\Windows";
const POWERSHELL = `${WINDIR}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
const CMD = `${WINDIR}\\System32\\cmd.exe`;
const POWERSHELL7 = process.env.ProgramFiles ? `${process.env.ProgramFiles}\\PowerShell\\7\\pwsh.exe` : "pwsh.exe";
const WT = "wt.exe";

function psQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function encodePS(script: string): string {
  return Buffer.from(script, "utf16le").toString("base64");
}

function buildScript(app: ShellApp): string {
  const parts: string[] = [];
  if (app.workingDirectory && app.workingDirectory.trim()) {
    parts.push(`Set-Location -LiteralPath ${psQuote(app.workingDirectory.trim())}`);
  }
  parts.push(app.command.trim());
  return parts.join("; ");
}

interface LaunchTarget {
  exe: string;
  args: string[];
}

function buildArgs(app: ShellApp): LaunchTarget {
  const keep = app.keepOpen;
  const script = buildScript(app);

  switch (app.terminal) {
    case "powershell":
      return {
        exe: POWERSHELL,
        args: ["-NoLogo", ...(keep ? ["-NoExit"] : []), "-EncodedCommand", encodePS(script)],
      };
    case "powershell7":
      return {
        exe: POWERSHELL7,
        args: ["-NoLogo", ...(keep ? ["-NoExit"] : []), "-EncodedCommand", encodePS(script)],
      };
    case "cmd":
      return { exe: CMD, args: [keep ? "/k" : "/c", app.command.trim()] };
    case "wt":
      return {
        exe: WT,
        args: [
          "new-tab",
          "--title",
          app.name,
          POWERSHELL,
          "-NoLogo",
          ...(keep ? ["-NoExit"] : []),
          "-EncodedCommand",
          encodePS(script),
        ],
      };
  }
}

function buildCmdFile(app: ShellApp): string {
  const lines = ["@echo off", `cd /d "${app.workingDirectory?.trim() ?? ""}"`, app.command.trim()];
  if (app.keepOpen) lines.push("pause");
  // The launcher exits right after starting the terminal, so the batch file
  // must not be deleted by the host while the (elevated) process is still
  // starting up. Let the file delete itself once the batch is done.
  lines.push(`start "" /b cmd /d /c del /q "%~f0" >nul 2>&1`);
  return lines.join("\r\n") + "\r\n";
}

interface LauncherScript {
  script: string;
  cmdFile?: { path: string; content: string };
}

/**
 * The extension host is a GUI process without a console, so spawning a terminal
 * directly (with `detached: true`) gives it no visible window and PowerShell
 * exits without running the command. Instead we spawn a throwaway PowerShell
 * (hidden via `windowsHide` and `-WindowStyle Hidden`) that uses `Start-Process`
 * to open the real terminal in its own visible console window, fully decoupled
 * from the extension host.
 *
 * The extension host runs in a packaged (MSIX) sandbox; processes spawned
 * directly from it stay sandboxed and can't resolve or run external tools
 * like `wsl`. Routing the throwaway PowerShell through `cmd.exe` breaks the
 * process out of the sandbox, so the real terminal runs as a normal user
 * process. We also rebuild a guaranteed-good PATH from the registry with a
 * hardcoded `C:\Windows` fallback, always including System32.
 */
const RESTORE_PATH = [
  `$__spa_sys = (Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion' -Name SystemRoot -ErrorAction SilentlyContinue).SystemRoot;`,
  `if (-not $__spa_sys) { $__spa_sys = $env:SystemRoot };`,
  `if (-not $__spa_sys) { $__spa_sys = 'C:\\Windows' };`,
  `$__spa_mp = (Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment' -Name Path -ErrorAction SilentlyContinue).Path;`,
  `$__spa_up = (Get-ItemProperty -Path 'HKCU:\\Environment' -Name Path -ErrorAction SilentlyContinue).Path;`,
  `$env:PATH = (@("$__spa_sys\\System32;$__spa_sys", $__spa_mp, $__spa_up, $env:PATH) | Where-Object { $_ }) -join ';'`,
].join(" ");

function buildLauncherScript(app: ShellApp, resultFile: string, cmdFilePath: string): LauncherScript {
  const writeError = `Set-Content -LiteralPath ${psQuote(resultFile)} -Value $_.Exception.Message`;
  const wd = app.workingDirectory?.trim();
  const elevated = app.runAsAdmin;
  // `cmd` can't take a working directory as an argument without the quotes
  // getting mangled by `Start-Process -ArgumentList`, and `-WorkingDirectory`
  // is disallowed with `-Verb RunAs` (an elevated process starts in System32
  // regardless), so for elevated `cmd` we launch a temp `.cmd` file that
  // `cd /d`s first.
  const viaCmdFile = app.terminal === "cmd" && !!wd && elevated;

  const startProcessStatement = (target: LaunchTarget, useCmdFile: boolean): string => {
    if (useCmdFile) {
      return `Start-Process -FilePath ${psQuote(cmdFilePath)} -Verb RunAs -ErrorAction Stop`;
    }
    const parts = [
      "Start-Process",
      `-FilePath ${psQuote(target.exe)}`,
      `-ArgumentList @(${target.args.map(psQuote).join(", ")})`,
    ];
    if (wd && !elevated) {
      parts.push(`-WorkingDirectory ${psQuote(wd)}`);
    }
    if (elevated) {
      parts.push("-Verb RunAs");
    }
    parts.push("-ErrorAction Stop");
    return parts.join(" ");
  };

  const target = buildArgs(app);
  let body: string;
  if (app.terminal === "wt") {
    // Fall back to PowerShell when Windows Terminal is not available.
    const fallback = buildArgs({ ...app, terminal: "powershell" as TerminalKind });
    body = `try { ${startProcessStatement(target, false)} } catch { try { ${startProcessStatement(fallback, false)} } catch { ${writeError}; exit 1 } }`;
  } else {
    body = `try { ${startProcessStatement(target, viaCmdFile)} } catch { ${writeError}; exit 1 }`;
  }

  const script = `${RESTORE_PATH}; ${body}`;
  return viaCmdFile ? { script, cmdFile: { path: cmdFilePath, content: buildCmdFile(app) } } : { script };
}

/**
 * Launches the app in a dedicated terminal window.
 * Resolves with an error message on failure, or `null` on success.
 */
export function launchApp(app: ShellApp): Promise<string | null> {
  return new Promise((resolve) => {
    const resultFile = join(tmpdir(), `shell-apps-launch-${randomUUID()}.txt`);
    const psFile = join(tmpdir(), `shell-apps-launcher-${randomUUID()}.ps1`);
    const cmdFile = join(tmpdir(), `shell-apps-cmd-${randomUUID()}.cmd`);
    const { script, cmdFile: cmdFileContent } = buildLauncherScript(app, resultFile, cmdFile);

    let settled = false;
    const cleanup = () => {
      for (const file of [resultFile, psFile]) {
        try {
          unlinkSync(file);
        } catch {
          // ignore
        }
      }
    };
    // The batch file deletes itself once the terminal has run. As a fallback
    // (e.g. the command called `exit` early), remove it a while later so the
    // elevated process always has time to read it first.
    if (cmdFileContent) {
      setTimeout(() => {
        try {
          unlinkSync(cmdFile);
        } catch {
          // ignore
        }
      }, 60000);
    }
    const settle = (message: string | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(message);
    };

    try {
      writeFileSync(psFile, "\ufeff" + script, "utf8");
      if (cmdFileContent) {
        writeFileSync(cmdFile, cmdFileContent.content, "utf8");
      }
    } catch (error) {
      settle(`Failed to write launcher script: ${(error as Error).message}`);
      return;
    }

    const cmdLine = `""${POWERSHELL}" -NoLogo -WindowStyle Hidden -ExecutionPolicy Bypass -File "${psFile}""`;
    const child = spawn(CMD, ["/d", "/s", "/c", cmdLine], {
      stdio: "ignore",
      windowsHide: true,
      windowsVerbatimArguments: true,
    });
    const timer = setTimeout(() => {
      try {
        child.kill();
      } catch {
        // ignore
      }
      settle("Timed out launching terminal");
    }, 15000);

    child.on("error", (error) => {
      clearTimeout(timer);
      settle(`Failed to launch terminal: ${error.message}`);
    });

    child.on("exit", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        settle(null);
        return;
      }
      let message = "Failed to launch terminal";
      try {
        const detail = readFileSync(resultFile, "utf8").trim();
        if (detail) message = `Failed to launch terminal: ${detail}`;
      } catch {
        // result file may not exist
      }
      settle(message);
    });
  });
}
