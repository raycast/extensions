import { exec as execCallback, execSync } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { delimiter, join } from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(execCallback);

export function getEnv(): NodeJS.ProcessEnv {
  const home = process.env.HOME ?? "";
  const extraPaths = [
    home ? `${home}/.local/bin` : "",
    home ? `${home}/.opencode/bin` : "",
    home ? `${home}/.bun/bin` : "",
    "/opt/homebrew/bin",
    "/opt/homebrew/sbin",
    "/opt/zerobrew/prefix/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
    "/Applications/Tailscale.app/Contents/MacOS",
  ];
  const currentPath = (process.env.PATH ?? "").split(delimiter);
  const path = [
    ...new Set([...extraPaths, ...currentPath].filter(Boolean)),
  ].join(delimiter);

  return {
    ...process.env,
    PATH: path,
  };
}

export function which(cmd: string): boolean {
  if (cmd.includes("/")) {
    try {
      accessSync(cmd, constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  const env = getEnv();
  const dirs = (env.PATH ?? "").split(delimiter);

  for (const dir of dirs) {
    if (!dir) continue;
    try {
      accessSync(join(dir, cmd), constants.X_OK);
      return true;
    } catch {
      // not in this dir
    }
  }
  return false;
}

export async function run(
  cmd: string,
): Promise<{ stdout: string; stderr: string }> {
  const { stdout, stderr } = await execAsync(cmd, {
    env: getEnv(),
    maxBuffer: 10 * 1024 * 1024,
  });

  return {
    stdout: stdout.trim(),
    stderr: stderr.trim(),
  };
}

export function runSync(cmd: string): string {
  const output = execSync(cmd, {
    env: getEnv(),
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  return output.trim();
}

export function shellQuote(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}
