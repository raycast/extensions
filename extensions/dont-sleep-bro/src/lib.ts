import { execFile, spawn } from "child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { homedir } from "os";
import { join } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/** Shared with CLI (`~/.local/bin/dont_sleep_bro`) when present. */
const STATE_DIR = join(homedir(), ".cache", "dont_sleep_bro");
const PIDFILE = join(STATE_DIR, "caffeinate.pid");

function ensureStateDir() {
  mkdirSync(STATE_DIR, { recursive: true });
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readPid(): number | null {
  if (!existsSync(PIDFILE)) return null;
  const pid = parseInt(readFileSync(PIDFILE, "utf8").trim(), 10);
  if (Number.isNaN(pid)) return null;
  if (!isAlive(pid)) {
    try {
      unlinkSync(PIDFILE);
    } catch {
      // ignore
    }
    return null;
  }
  return pid;
}

/** Run a shell snippet as root via macOS password dialog (one prompt). */
async function runAdmin(shellScript: string): Promise<void> {
  await execFileAsync("osascript", [
    "-e",
    `do shell script ${JSON.stringify(shellScript)} with administrator privileges`,
  ]);
}

async function execOut(cmd: string, args: string[]): Promise<string> {
  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, {
      env: { ...process.env, PATH: "/usr/bin:/bin:/usr/sbin:/sbin" },
      maxBuffer: 1024 * 1024,
    });
    return [stdout, stderr].filter(Boolean).join("\n").trim();
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    const out = [err.stdout, err.stderr].filter(Boolean).join("\n").trim();
    if (out) return out;
    throw e;
  }
}

export type StartResult = { alreadyOn: boolean; message: string };

export async function start(): Promise<StartResult> {
  ensureStateDir();
  const existing = readPid();
  if (existing !== null) {
    return {
      alreadyOn: true,
      message: `already on (caffeinate pid ${existing})`,
    };
  }

  // -a = battery + AC. disablesleep is what blocks lid-close sleep on battery.
  await runAdmin(
    "/usr/bin/pmset -a disablesleep 1 && /usr/bin/pmset -a sleep 0 && /usr/bin/pmset -a displaysleep 0 && /usr/bin/pmset -a disksleep 0",
  );

  // -d display, -i idle system, -m disk, -u user-active (helps avoid lock)
  const child = spawn("/usr/bin/caffeinate", ["-dimu"], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  if (!child.pid) {
    throw new Error("Failed to start caffeinate");
  }
  writeFileSync(PIDFILE, String(child.pid));

  return { alreadyOn: false, message: "dont_sleep_bro: ON" };
}

export async function stop(): Promise<string> {
  ensureStateDir();
  const pid = readPid();
  if (pid !== null) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // ignore
    }
    try {
      unlinkSync(PIDFILE);
    } catch {
      // ignore
    }
  }

  await runAdmin(
    "/usr/bin/pmset -a disablesleep 0 && /usr/bin/pmset -a sleep 1 && /usr/bin/pmset -a displaysleep 10 && /usr/bin/pmset -a disksleep 10",
  );

  return "dont_sleep_bro: OFF";
}

export async function status(): Promise<string> {
  ensureStateDir();
  const lines: string[] = [];
  const pid = readPid();
  if (pid !== null) {
    lines.push(`status: ON (caffeinate pid ${pid})`);
  } else {
    lines.push("status: OFF");
  }

  const pmset = await execOut("/usr/bin/pmset", ["-g"]);
  lines.push(
    ...pmset
      .split("\n")
      .filter((l) => /SleepDisabled|\bsleep\b|displaysleep|disksleep/.test(l)),
  );

  const assertions = await execOut("/usr/bin/pmset", ["-g", "assertions"]);
  lines.push(
    ...assertions
      .split("\n")
      .filter((l) =>
        /PreventUserIdle|PreventSystem|caffeinate|SleepDisabled/.test(l),
      ),
  );

  return lines.join("\n").trim();
}
