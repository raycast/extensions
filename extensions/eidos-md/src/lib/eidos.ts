// The eidos CLI, the only way the extension reads a project (Raycast Extension REQ11): the eidos the person's login
// shell finds, else the CLI inside Eidos MD, run on the app's own Node the way the app's PATH shim runs it.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

export interface Runner {
  file: string;
  // what comes before the command's own arguments: the shim's script when the app's binary runs the CLI
  lead: string[];
  env: NodeJS.ProcessEnv;
  // a Windows .cmd or .bat runs through the shell
  shell: boolean;
}

// The CLI could not be found or could not run; `missing` says the person has neither the app nor the CLI.
export class EidosError extends Error {
  constructor(
    message: string,
    readonly missing: boolean = false,
  ) {
    super(message);
  }
}

// The same script the app writes into its PATH shim: the CLI inside the app's archive, run as Node.
const SHIM =
  "const p=require('path'),u=require('url');const r=process.platform==='darwin'?p.join(p.dirname(process.execPath),'..','Resources'):p.join(p.dirname(process.execPath),'resources');const c=p.join(r,'app.asar','node_modules','eidosmd','dist','src','cli.js');process.argv.splice(1,0,c);import(u.pathToFileURL(c).href)";

function appRunner(binary: string): Runner {
  return { file: binary, lead: ["-e", SHIM, "--"], env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" }, shell: false };
}

function plainRunner(file: string, env: NodeJS.ProcessEnv = process.env): Runner {
  return { file, lead: [], env, shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(file) };
}

// The PATH a login shell sets up, which an app started from the Dock does not inherit.
async function loginShellEnv(): Promise<NodeJS.ProcessEnv> {
  const shell = process.env.SHELL && existsSync(process.env.SHELL) ? process.env.SHELL : "/bin/zsh";
  try {
    const { stdout } = await run(shell, ["-l", "-c", 'printf "%s" "$PATH"'], { timeout: 5000 });
    return stdout.trim() === "" ? process.env : { ...process.env, PATH: stdout.trim() };
  } catch {
    return process.env;
  }
}

async function onPath(env: NodeJS.ProcessEnv): Promise<string | null> {
  try {
    if (process.platform === "win32") {
      const { stdout } = await run("where.exe", ["eidos"], { env, timeout: 5000 });
      const lines = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line !== "");
      return lines.find((line) => /\.(cmd|exe)$/i.test(line)) ?? lines[0] ?? null;
    }
    const { stdout } = await run("/bin/sh", ["-c", "command -v eidos"], { env, timeout: 5000 });
    return stdout.trim() === "" ? null : stdout.trim();
  } catch {
    return null;
  }
}

// Eidos MD's own binary. On Windows the installer writes it into the folder's "Open with Eidos MD" entry, so the
// registry names it wherever the person chose to install.
export async function appBinary(): Promise<string | null> {
  if (process.platform === "darwin") {
    for (const apps of ["/Applications", path.join(homedir(), "Applications")]) {
      const binary = path.join(apps, "Eidos MD.app", "Contents", "MacOS", "Eidos MD");
      if (existsSync(binary)) return binary;
    }
    return null;
  }
  if (process.platform === "win32") {
    try {
      const { stdout } = await run(
        "reg.exe",
        ["query", "HKCU\\Software\\Classes\\Directory\\shell\\EidosMD\\command", "/ve"],
        {
          timeout: 5000,
        },
      );
      const binary = /"([^"]+\.exe)"/i.exec(stdout)?.[1];
      if (binary && existsSync(binary)) return binary;
    } catch {
      // not installed for this user
    }
    const local = process.env.LOCALAPPDATA ?? path.join(homedir(), "AppData", "Local");
    for (const folder of ["Eidos MD", "eidosmd-desktop", "@eidosmddesktop"]) {
      const binary = path.join(local, "Programs", folder, "Eidos MD.exe");
      if (existsSync(binary)) return binary;
    }
  }
  return null;
}

let found: Promise<Runner> | null = null;

// The runner, found once per command: the preference, then the PATH, then the app.
export function findEidos(preferred?: string): Promise<Runner> {
  if (found) return found;
  found = (async () => {
    if (preferred && existsSync(preferred)) return plainRunner(preferred);
    const env = process.platform === "win32" ? process.env : await loginShellEnv();
    const command = await onPath(env);
    if (command) return plainRunner(command, env);
    const binary = await appBinary();
    if (binary) return appRunner(binary);
    throw new EidosError("Eidos MD is not installed, and eidos is not on your PATH.", true);
  })();
  found.catch(() => {
    found = null;
  });
  return found;
}

// A Windows shell takes one command line: each argument quoted, its own quotes doubled.
function quoted(argument: string): string {
  return `"${argument.replace(/"/g, '""')}"`;
}

// One eidos command in a project, its --json output parsed.
export async function eidosJson<T>(runner: Runner, root: string, args: string[]): Promise<T> {
  const all = [...runner.lead, ...args, "--project", root, "--json"];
  try {
    const { stdout } = await run(
      runner.shell ? quoted(runner.file) : runner.file,
      runner.shell ? all.map(quoted) : all,
      {
        cwd: root,
        env: runner.env,
        maxBuffer: 256 * 1024 * 1024,
        timeout: 30_000,
        shell: runner.shell,
        windowsHide: true,
      },
    );
    return JSON.parse(stdout) as T;
  } catch (cause) {
    const stderr = (cause as { stderr?: unknown }).stderr;
    const said = typeof stderr === "string" ? stderr.trim().split(/\r?\n/)[0] : "";
    throw new EidosError(said || (cause instanceof Error ? cause.message : String(cause)));
  }
}

const known = new Map<string, Promise<boolean>>();

// Whether this eidos has a command: `eidos help <command>` exits 0 only where the command exists (`<command> --help`
// falls back to the general help and exits 0 either way), so an older eidos, one before `eidos search`, is told apart
// by the exit code rather than by the words of its error.
export function hasCommand(runner: Runner, command: string): Promise<boolean> {
  const key = `${runner.file}\0${command}`;
  const held = known.get(key);
  if (held) return held;
  const all = [...runner.lead, "help", command];
  const asked = run(runner.shell ? quoted(runner.file) : runner.file, runner.shell ? all.map(quoted) : all, {
    env: runner.env,
    timeout: 15_000,
    shell: runner.shell,
    windowsHide: true,
  }).then(
    () => true,
    () => false,
  );
  known.set(key, asked);
  return asked;
}
