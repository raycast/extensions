import { execFile, spawn } from "child_process";
import { randomUUID } from "crypto";
import { promisify } from "util";
import fs from "fs";
import os from "os";
import path from "path";
import {
  closeMainWindow,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";

const execFileAsync = promisify(execFile);

/**
 * Raycast may carry a stale PATH (captured when its process started) and child
 * terminals inherit that environment, so claude and shell prompt tools may not
 * resolve. All resolution therefore happens here in Node, outside any MSIX
 * container: the true PATH (machine + user) is read from the registry via
 * reg.exe, claude is located on it, and the launched shells only receive
 * ready-made literal strings.
 */
function expandEnvRefs(value: string): string {
  return value.replace(
    /%([^%]+)%/g,
    (match, name: string) => process.env[name] ?? match,
  );
}

async function regPath(key: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("reg", ["query", key, "/v", "Path"]);
    const match = /\bPath\s+REG(?:_EXPAND)?_SZ\s+(.+)/i.exec(stdout);
    return match ? expandEnvRefs(match[1].trim()) : "";
  } catch {
    return "";
  }
}

async function realPath(): Promise<string> {
  const [machine, user] = await Promise.all([
    regPath(
      "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment",
    ),
    regPath("HKCU\\Environment"),
  ]);
  const combined =
    [machine, user].filter(Boolean).join(";") || (process.env.PATH ?? "");

  // Safety net in case the registry read fails in the Raycast context:
  // default install locations of oh-my-posh (winget), claude (native) and npm.
  const wellKnown = [
    path.join(process.env.LOCALAPPDATA ?? "", "Programs", "oh-my-posh", "bin"),
    path.join(process.env.USERPROFILE ?? "", ".local", "bin"),
    path.join(process.env.APPDATA ?? "", "npm"),
  ].filter((dir) => dir.length > 3 && fs.existsSync(dir));

  const present = new Set(
    combined.split(";").map((d) => d.trim().replace(/\\+$/, "").toLowerCase()),
  );
  const missing = wellKnown.filter(
    (d) => !present.has(d.replace(/\\+$/, "").toLowerCase()),
  );
  return missing.length > 0 ? `${combined};${missing.join(";")}` : combined;
}

function findClaude(pathString: string): string | null {
  for (const dir of pathString.split(";").filter(Boolean)) {
    for (const name of ["claude.exe", "claude.cmd", "claude.bat"]) {
      const candidate = path.join(dir.trim(), name);
      try {
        if (fs.existsSync(candidate)) return candidate;
      } catch {
        // inaccessible folder — try the next one
      }
    }
  }
  return null;
}

function psQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Splits the free-form claudeArgs preference into argv tokens, honouring
 * double and single quotes so values with spaces survive intact
 * (e.g. --add-dir "C:\My Projects").
 */
function splitArgs(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  let inToken = false;
  for (const ch of input) {
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      inToken = true;
    } else if (/\s/.test(ch)) {
      if (inToken) tokens.push(current);
      current = "";
      inToken = false;
    } else {
      current += ch;
      inToken = true;
    }
  }
  if (inToken) tokens.push(current);
  return tokens;
}

/**
 * Quotes one argument for the cmd branch. Wrapping in double quotes keeps
 * whitespace and metacharacters (& | ; ...) literal; embedded double quotes
 * are dropped because they are illegal in Windows paths and cannot be
 * escaped reliably through cmd's start.
 */
function cmdQuote(value: string): string {
  const cleaned = value.replace(/"/g, "");
  return cleaned === "" || /[\s&|<>^()%!;=,]/.test(cleaned)
    ? `"${cleaned}"`
    : cleaned;
}

const LAUNCH_SCRIPT_PREFIX = "claude-code-projects-launch-";

/**
 * A literal % cannot be escaped on the cmd command line: quoting does not
 * stop %NAME% expansion and %% only escapes inside batch scripts — and here
 * the command would cross two cmd layers (the outer `cmd /s /c "start ..."`
 * plus the inner `cmd /k`). Writing the claude call to a batch file, where
 * %% reliably yields a literal %, keeps the arguments out of both parsers.
 *
 * Each launch gets its own file so overlapping launches cannot overwrite one
 * another before the (asynchronous) inner cmd reads the script. Scripts from
 * past launches are deleted after a day — long enough that their sessions
 * have read them, since cmd only re-reads the file after claude exits.
 */
function writeCmdLaunchScript(claudeCall: string): string {
  const dir = os.tmpdir();
  try {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const name of fs.readdirSync(dir)) {
      if (!name.startsWith(LAUNCH_SCRIPT_PREFIX) || !name.endsWith(".cmd")) {
        continue;
      }
      const full = path.join(dir, name);
      try {
        if (fs.statSync(full).mtimeMs < cutoff) fs.unlinkSync(full);
      } catch {
        // already gone or inaccessible — cleanup is best-effort
      }
    }
  } catch {
    // cleanup is best-effort
  }
  const scriptPath = path.join(
    dir,
    `${LAUNCH_SCRIPT_PREFIX}${randomUUID()}.cmd`,
  );
  fs.writeFileSync(
    scriptPath,
    `@echo off\r\n${claudeCall.replace(/%/g, "%%")}\r\n`,
  );
  return scriptPath;
}

function encodedStartupScript(
  realPathString: string,
  claudeExe: string | null,
  args: string[],
): string {
  const quotedArgs = args.map(psQuote).join(" ");
  const claudeCall = claudeExe
    ? `& ${psQuote(claudeExe)} ${quotedArgs}`.trim()
    : `claude ${quotedArgs}`.trim();
  const script = [
    `$env:Path = ${psQuote(realPathString)}`,
    "if (Test-Path $PROFILE) { . $PROFILE }",
    claudeCall,
  ].join("\n");
  return Buffer.from(script, "utf16le").toString("base64");
}

function onFail(message: string) {
  return () => {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to open the terminal",
      message,
    });
  };
}

/**
 * Opens a new console window via cmd's `start`. Needed because spawn with
 * detached uses DETACHED_PROCESS, which creates the process WITHOUT a visible
 * console.
 */
function runInNewWindow(
  shellCommand: string,
  cwd: string,
  env: NodeJS.ProcessEnv,
  missingMsg: string,
): void {
  const inner = `start "" /d "${cwd}" ${shellCommand}`;
  const child = spawn("cmd.exe", ["/d", "/s", "/c", `"${inner}"`], {
    detached: true,
    stdio: "ignore",
    windowsVerbatimArguments: true,
    env,
  });
  child.on("error", onFail(missingMsg));
  child.on("exit", (code) => {
    if (code !== 0) onFail(missingMsg)();
  });
  child.unref();
}

/**
 * Opens a new Windows Terminal tab (most recent window, or a new one) running
 * claude directly by absolute path — no shell or profile in between, so the
 * inherited PATH and prompt tools like oh-my-posh never come into play.
 */
function runInTerminalTab(
  cwd: string,
  claudeExe: string | null,
  args: string[],
): void {
  const command = [claudeExe ?? "claude", ...args];
  const child = spawn("wt.exe", ["-w", "0", "nt", "-d", cwd, ...command], {
    detached: true,
    stdio: "ignore",
  });
  child.on(
    "error",
    onFail(
      "Windows Terminal (wt) not found. Change the terminal in the extension preferences.",
    ),
  );
  child.unref();
}

/** Opens the terminal chosen in preferences inside cwd, running the claude command. */
export async function launchClaude(
  cwd: string,
  baseArgs: string[],
): Promise<void> {
  if (cwd.includes('"')) return; // invalid Windows path; avoids breaking the shell

  const { terminal, claudeArgs } = getPreferenceValues<Preferences>();
  const args = [...baseArgs, ...splitArgs(claudeArgs ?? "")];

  const pathString = await realPath();
  const claudeExe = findClaude(pathString);
  const encoded = encodedStartupScript(pathString, claudeExe, args);

  const env = { ...process.env };
  delete env.PATH;
  env.Path = pathString;

  await closeMainWindow();

  switch (terminal) {
    case "pwsh":
      runInNewWindow(
        `pwsh -NoProfile -NoExit -EncodedCommand ${encoded}`,
        cwd,
        env,
        "PowerShell 7 (pwsh) not found on PATH.",
      );
      break;
    case "powershell":
      runInNewWindow(
        `powershell -NoProfile -NoExit -EncodedCommand ${encoded}`,
        cwd,
        env,
        "Windows PowerShell not found.",
      );
      break;
    case "cmd": {
      const claudeCall = [
        claudeExe ? cmdQuote(claudeExe) : "claude",
        ...args.map(cmdQuote),
      ].join(" ");
      let script: string;
      try {
        script = writeCmdLaunchScript(claudeCall);
      } catch {
        onFail("Could not write the launch script to the temp folder.")();
        return;
      }
      runInNewWindow(`cmd /k "${script}"`, cwd, env, "cmd not found.");
      break;
    }
    case "windowsTerminal":
    default:
      runInTerminalTab(cwd, claudeExe, args);
      break;
  }
}
