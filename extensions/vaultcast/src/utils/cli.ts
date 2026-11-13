import { execFile } from "child_process";
import { existsSync } from "fs";
import { homedir, platform } from "os";
import { delimiter, dirname, join } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const DEFAULT_TIMEOUT_MS = 30000;
const isWindows = platform() === "win32";

function getSearchPaths(): string[] {
  if (isWindows) {
    const paths: string[] = [];
    const localAppData = process.env.LOCALAPPDATA;
    const appData = process.env.APPDATA;

    if (localAppData) {
      paths.push(join(localAppData, "Programs", "pass-cli"));
      paths.push(join(localAppData, "Programs"));
    }

    if (appData) {
      paths.push(join(appData, "npm"));
    }

    // The KeePassXC MSI does not put keepassxc-cli on PATH.
    paths.push(join(process.env.ProgramFiles ?? "C:\\Program Files", "KeePassXC"));

    return paths;
  }

  return [
    `${homedir()}/.local/bin`,
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    // The KeePassXC DMG does not put keepassxc-cli on PATH.
    "/Applications/KeePassXC.app/Contents/MacOS",
  ];
}

function getCandidateNames(name: string): string[] {
  if (isWindows && !name.toLowerCase().endsWith(".exe")) {
    return [name, `${name}.exe`];
  }

  return [name];
}

async function findInPath(name: string): Promise<string | undefined> {
  if (isWindows) {
    for (const candidate of getCandidateNames(name)) {
      try {
        const { stdout } = await execFileAsync("where.exe", [candidate], { timeout: 5000 });
        const match = stdout
          .split(/\r?\n/)
          .map((line) => line.trim())
          .find((line) => line && existsSync(line));

        if (match) {
          return match;
        }
      } catch {
        // binary not in PATH
      }
    }

    return undefined;
  }

  try {
    const { stdout } = await execFileAsync("/usr/bin/which", [name], { timeout: 5000 });
    const path = stdout.trim();
    if (path && existsSync(path)) {
      return path;
    }
  } catch {
    // which failed — binary not in PATH
  }

  return undefined;
}

export class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode?: number,
    readonly stderr?: string,
  ) {
    super(message);
    this.name = "CliError";
  }
}

/** The manager's vault is locked; `wrapAdapterWithAutoUnlock` re-authenticates and retries on it. */
export class SessionLockedError extends Error {
  constructor(message = "Session is locked.") {
    super(message);
    this.name = "SessionLockedError";
  }
}

export async function resolveBinary(name: string, customPath?: string): Promise<string | undefined> {
  if (customPath) {
    if (existsSync(customPath)) {
      return customPath;
    }
    return undefined;
  }

  for (const dir of getSearchPaths()) {
    for (const candidate of getCandidateNames(name)) {
      const fullPath = join(dir, candidate);
      if (existsSync(fullPath)) {
        return fullPath;
      }
    }
  }

  return findInPath(name);
}

// Raycast's PATH lacks Homebrew. Script CLIs (pass → gpg, getopt) find their siblings via the binary's dir.
function binaryDirOnPath(binary: string): Record<string, string> {
  if (isWindows) {
    return {};
  }
  return { PATH: [dirname(binary), process.env.PATH].filter(Boolean).join(delimiter) };
}

export async function runCli(
  binary: string,
  args: string[],
  options?: { env?: Record<string, string>; timeoutMs?: number; input?: string },
): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  try {
    const run = execFileAsync(binary, args, {
      env: { ...process.env, ...binaryDirOnPath(binary), ...options?.env },
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
    });
    // Always close stdin: CLIs that prompt (lpass, dcli, keeper) would otherwise wait on the open pipe until the timeout.
    run.child.stdin?.end(options?.input);
    const { stdout, stderr } = await run;

    if (stderr?.trim()) {
      // Some CLIs write warnings to stderr; only treat as error if stdout is empty
      if (!stdout?.trim()) {
        throw new CliError(stderr.trim(), undefined, stderr);
      }
    }

    // Not trimmed: values such as passwords may start or end with meaningful whitespace.
    return stdout;
  } catch (error) {
    if (error instanceof CliError) {
      throw error;
    }

    const execError = error as { code?: number | string; stderr?: string; message?: string };
    const stderr = execError.stderr?.toString().trim();
    const message = stderr || execError.message || "CLI command failed";
    const exitCode = typeof execError.code === "number" ? execError.code : undefined;
    throw new CliError(message, exitCode, stderr);
  }
}

export function parseJson<T>(stdout: string): T {
  try {
    return JSON.parse(stdout) as T;
  } catch {
    // No stdout excerpt (nor the SyntaxError, which quotes it): the output may contain secrets.
    throw new CliError(`Failed to parse CLI JSON output (${stdout.length} characters)`);
  }
}
