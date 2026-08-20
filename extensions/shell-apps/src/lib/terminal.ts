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

function buildLauncherScript(app: ShellApp, resultFile: string): string {
  const writeError = `Set-Content -LiteralPath ${psQuote(resultFile)} -Value $_.Exception.Message`;
  const wd = app.workingDirectory?.trim();
  const elevated = app.runAsAdmin;

  // An elevated process always starts in System32 (`-WorkingDirectory` is
  // disallowed with `-Verb RunAs`), so for elevated `cmd` the working
  // directory has to be part of the payload itself. It is passed inline via
  // `ProcessStartInfo.Arguments` instead of a temp batch file: a batch file
  // sits in a user-writable temp folder while the UAC prompt is pending, so
  // another process running as the same user could swap its contents and get
  // arbitrary commands executed elevated. Command-line arguments are fixed
  // once the process is created, leaving nothing to tamper with afterwards.
  const startElevatedCmd = (): string => {
    const inner = [...(wd ? [`cd /d "${wd}"`] : []), app.command.trim()].join(" && ");
    return [
      "$__psi = New-Object System.Diagnostics.ProcessStartInfo",
      `$__psi.FileName = ${psQuote(CMD)}`,
      `$__psi.Arguments = ${psQuote(`/d /s /${app.keepOpen ? "k" : "c"} "${inner}"`)}`,
      "$__psi.Verb = 'runas'",
      "$__psi.UseShellExecute = $true",
      "[System.Diagnostics.Process]::Start($__psi) > $null",
    ].join("; ");
  };

  const startProcessStatement = (target: LaunchTarget): string => {
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

  let body: string;
  if (app.terminal === "wt") {
    // Fall back to PowerShell when Windows Terminal is not available.
    const target = buildArgs(app);
    const fallback = buildArgs({ ...app, terminal: "powershell" as TerminalKind });
    body = `try { ${startProcessStatement(target)} } catch { try { ${startProcessStatement(fallback)} } catch { ${writeError}; exit 1 } }`;
  } else if (app.terminal === "cmd" && elevated) {
    body = `try { ${startElevatedCmd()} } catch { ${writeError}; exit 1 }`;
  } else {
    body = `try { ${startProcessStatement(buildArgs(app))} } catch { ${writeError}; exit 1 }`;
  }

  return `${RESTORE_PATH}; ${body}`;
}

/**
 * Launches the app in a dedicated terminal window.
 * Resolves with an error message on failure, or `null` on success.
 */
export function launchApp(app: ShellApp): Promise<string | null> {
  return new Promise((resolve) => {
    const resultFile = join(tmpdir(), `shell-apps-launch-${randomUUID()}.txt`);
    const psFile = join(tmpdir(), `shell-apps-launcher-${randomUUID()}.ps1`);
    const script = buildLauncherScript(app, resultFile);

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
    const settle = (message: string | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(message);
    };

    try {
      writeFileSync(psFile, "\ufeff" + script, "utf8");
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
