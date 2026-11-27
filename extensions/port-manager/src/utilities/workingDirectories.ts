import { CommandExitError, runCommand } from "./runCommand";

const LSOF_TIMEOUT = 5_000;

/** Parses `lsof -Fn` output for the `cwd` descriptor into working directories by PID. */
export function parseWorkingDirectories(stdout: string) {
  const directories = new Map<number, string>();
  let pid: number | undefined;

  for (const line of stdout.split("\n")) {
    if (line.startsWith("p")) pid = Number(line.slice(1));
    else if (line.startsWith("n") && pid !== undefined && line.length > 1) directories.set(pid, line.slice(1));
  }

  return directories;
}

/**
 * The working directory of each process, in one `lsof` call. Windows exposes no other process's
 * working directory without reading its memory, so the map is empty there. Lookups that fail leave
 * the process out; the directory only refines framework detection.
 */
export async function getWorkingDirectories(pids: number[]) {
  const uniquePids = Array.from(new Set(pids.filter((pid) => Number.isFinite(pid) && pid > 0)));
  if (process.platform === "win32" || uniquePids.length === 0) return new Map<number, string>();

  try {
    const { stdout } = await runCommand("/usr/sbin/lsof", ["-a", "-d", "cwd", "-Fn", "-p", uniquePids.join(",")], {
      timeout: LSOF_TIMEOUT,
      killProcessGroup: true,
    });
    return parseWorkingDirectories(stdout);
  } catch (error) {
    // lsof exits 1 when any PID has exited or belongs to another user, but still prints the rest.
    if (error instanceof CommandExitError) return parseWorkingDirectories(error.stdout);
    return new Map<number, string>();
  }
}
