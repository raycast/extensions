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
 * Raycast's MSIX environment can lack fundamental variables, not just a
 * stale PATH. Without LOCALAPPDATA, for example, VS Code's terminal cannot
 * find the Store install of pwsh and falls back to Windows PowerShell.
 * These are the well-known per-user defaults, derived from the profile dir.
 */
function essentialEnvDefaults(profile: string): [string, string][] {
  const local = path.join(profile, "AppData", "Local");
  return [
    ["APPDATA", path.join(profile, "AppData", "Roaming")],
    ["LOCALAPPDATA", local],
    ["TEMP", path.join(local, "Temp")],
    ["TMP", path.join(local, "Temp")],
  ];
}

/**
 * Splits the free-form claudeArgs preference into argv tokens, honouring
 * double and single quotes so values with spaces survive intact
 * (e.g. --add-dir "C:\My Projects").
 *
 * Backslashes follow the Windows CommandLineToArgvW rule, so the preference
 * behaves like the command line it stands for: a backslash is literal unless
 * it precedes a double quote, where 2n backslashes give n backslashes plus a
 * delimiting quote and 2n+1 give n backslashes plus a literal quote. That
 * keeps --prompt "say \"hello world\"" as a single argument. As on Windows, a
 * double-quoted value therefore cannot end in a lone backslash: write
 * "C:\My Projects\\" or drop the trailing separator. Single quotes have no
 * escape, so backslashes inside them are always literal.
 */
function splitArgs(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  let inToken = false;
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (ch === "\\" && quote !== "'") {
      let slashes = 0;
      while (input[i] === "\\") {
        slashes++;
        i++;
      }
      if (input[i] === '"') {
        current += "\\".repeat(slashes >> 1);
        // An odd count consumes the quote as a literal one; an even count
        // leaves it for the delimiter branches below.
        if (slashes % 2 === 1) {
          current += '"';
          i++;
        }
      } else {
        current += "\\".repeat(slashes);
      }
      inToken = true;
    } else if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
      i++;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      inToken = true;
      i++;
    } else if (/\s/.test(ch)) {
      if (inToken) tokens.push(current);
      current = "";
      inToken = false;
      i++;
    } else {
      current += ch;
      inToken = true;
      i++;
    }
  }
  if (inToken) tokens.push(current);
  return tokens;
}

/**
 * Quotes one argument for the cmd branches, where two parsers read the same
 * text: cmd, which only knows double quotes and the caret escape, and the
 * launched program, which follows the CommandLineToArgvW rule where \" is a
 * literal quote.
 *
 * So the value is first quoted the CommandLineToArgvW way — always wrapped in
 * double quotes, embedded quotes turned into \", and backslashes doubled only
 * where they precede a quote — and then every cmd metacharacter that ends up
 * outside cmd's own quoting is escaped with a caret. cmd ignores the backslash,
 * so each \" still toggles its quoting state and leaves the text in between
 * exposed; the caret pass is what keeps that text literal.
 */
function cmdQuote(value: string): string {
  let quoted = '"';
  let i = 0;
  while (i < value.length) {
    let slashes = 0;
    while (value[i] === "\\") {
      slashes++;
      i++;
    }
    if (i === value.length) {
      quoted += "\\".repeat(slashes * 2);
      break;
    }
    if (value[i] === '"') quoted += "\\".repeat(slashes * 2 + 1) + '"';
    else quoted += "\\".repeat(slashes) + value[i];
    i++;
  }
  quoted += '"';

  let escaped = "";
  let inQuotes = false;
  for (const ch of quoted) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && /[&|<>^()]/.test(ch)) escaped += "^";
    escaped += ch;
  }
  return escaped;
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
function writeCmdLaunchScript(lines: string[]): string {
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
  const body = lines.map((line) => line.replace(/%/g, "%%")).join("\r\n");
  fs.writeFileSync(scriptPath, `@echo off\r\n${body}\r\n`);
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
 * claude through a small launch script — no user shell profile in between, so
 * prompt tools like oh-my-posh never come into play.
 *
 * The script, not the spawn env, sets the real PATH: `wt -w 0 nt` attaches to
 * an existing window, and the new tab inherits the environment of that
 * window's process — which can be Raycast's stale environment if the window
 * was created by an earlier launch. Fixing PATH inside the script guarantees
 * claude and everything it spawns (hooks, editors, nested shells) see the
 * real environment regardless of which window hosts the tab.
 */
function runInTerminalTab(
  cwd: string,
  pathString: string,
  claudeExe: string | null,
  args: string[],
  env: NodeJS.ProcessEnv,
): void {
  const claudeCall = [
    claudeExe ? cmdQuote(claudeExe) : "claude",
    ...args.map(cmdQuote),
  ].join(" ");
  let script: string;
  try {
    // LANG/LC_ALL cleared and essential vars restored for the same reason
    // they are fixed in the spawn env in launchClaude — the attached tab
    // inherits the hosting window's environment, not the spawn env.
    const profile = env.USERPROFILE || os.homedir();
    script = writeCmdLaunchScript([
      `set "Path=${pathString}"`,
      'set "LANG="',
      'set "LC_ALL="',
      ...essentialEnvDefaults(profile).map(
        ([name, value]) => `if not defined ${name} set "${name}=${value}"`,
      ),
      claudeCall,
    ]);
  } catch {
    onFail("Could not write the launch script to the temp folder.")();
    return;
  }
  const child = spawn(
    "wt.exe",
    ["-w", "0", "nt", "-d", cwd, "cmd", "/d", "/c", script],
    {
      detached: true,
      stdio: "ignore",
      env,
    },
  );
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

  // Raycast's environment can carry a Windows BCP-47 locale tag (e.g.
  // "pt-BR-u-ca-gregory-...") in LC_ALL/LANG. POSIX tools spawned inside the
  // session (like Git's bash) reject that format with a warning on every
  // command, and a terminal opened by the user never defines these vars — so
  // drop them instead of forwarding.
  for (const key of Object.keys(env)) {
    if (key === "LANG" || key.startsWith("LC_")) delete env[key];
  }

  // Restore essential vars that Raycast's environment may miss entirely or
  // carry empty. Never overrides an existing non-empty value.
  const profile = env.USERPROFILE || os.homedir();
  for (const [name, value] of essentialEnvDefaults(profile)) {
    const existing = Object.keys(env).find(
      (k) => k.toUpperCase() === name.toUpperCase(),
    );
    if (!existing) env[name] = value;
    else if (!env[existing]) env[existing] = value;
  }

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
        script = writeCmdLaunchScript([claudeCall]);
      } catch {
        onFail("Could not write the launch script to the temp folder.")();
        return;
      }
      runInNewWindow(`cmd /k "${script}"`, cwd, env, "cmd not found.");
      break;
    }
    case "windowsTerminal":
    default:
      runInTerminalTab(cwd, pathString, claudeExe, args, env);
      break;
  }
}
