import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { readFileSync, unlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import type { ShellApp, TerminalKind } from "./types";

const WINDIR = process.env.SystemRoot || process.env.WINDIR || "C:\\Windows";
const POWERSHELL = `${WINDIR}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
const CMD = `${WINDIR}\\System32\\cmd.exe`;
const POWERSHELL7 = process.env.ProgramFiles
  ? `${process.env.ProgramFiles}\\PowerShell\\7\\pwsh.exe`
  : "pwsh.exe";
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

function startProcess(target: LaunchTarget): string {
  const args = target.args.map(psQuote).join(", ");
  return `Start-Process -FilePath ${psQuote(target.exe)} -ArgumentList @(${args}) -ErrorAction Stop`;
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
  const target = buildArgs(app);
  const writeError = `Set-Content -LiteralPath ${psQuote(resultFile)} -Value $_.Exception.Message`;

  let body: string;
  if (app.runAsAdmin) {
    const parts = [
      `Start-Process -FilePath ${psQuote(target.exe)}`,
      `-ArgumentList @(${target.args.map(psQuote).join(", ")})`,
      "-Verb RunAs",
      "-ErrorAction Stop",
    ];
    body = `try { ${parts.join(" ")} } catch { ${writeError}; exit 1 }`;
  } else if (app.terminal === "wt") {
    // Fall back to PowerShell when Windows Terminal is not available.
    const fallback = buildArgs({ ...app, terminal: "powershell" as TerminalKind });
    body = `try { ${startProcess(target)} } catch { try { ${startProcess(fallback)} } catch { ${writeError}; exit 1 } }`;
  } else {
    body = `try { ${startProcess(target)} } catch { ${writeError}; exit 1 }`;
  }

  // `cmd` can't take a working directory via a startup argument without the
  // quotes getting mangled by `Start-Process -ArgumentList`, so we set the
  // launcher's own location instead: the spawned terminal inherits it.
  const cmdPrefix =
    app.terminal === "cmd" && app.workingDirectory && app.workingDirectory.trim()
      ? `Set-Location -LiteralPath ${psQuote(app.workingDirectory.trim())}; `
      : "";

  return `${RESTORE_PATH}; ${cmdPrefix}${body}`;
}

/**
 * Launches the app in a dedicated terminal window.
 * Resolves with an error message on failure, or `null` on success.
 */
export function launchApp(app: ShellApp): Promise<string | null> {
  return new Promise((resolve) => {
    const resultFile = join(tmpdir(), `shell-apps-launch-${randomUUID()}.txt`);
    const script = buildLauncherScript(app, resultFile);
    const psFile = join(tmpdir(), `shell-apps-launcher-${randomUUID()}.ps1`);

    let settled = false;
    const cleanup = () => {
      try {
        unlinkSync(resultFile);
      } catch {
        // ignore
      }
      try {
        unlinkSync(psFile);
      } catch {
        // ignore
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
