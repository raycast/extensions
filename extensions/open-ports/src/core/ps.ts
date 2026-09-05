import { runCommand } from "./exec";
import { isValidPid } from "./signals";
import { ProcessDetails } from "./types";

const PS = "/bin/ps";

/**
 * `lstart` is always five whitespace-separated tokens under `LC_ALL=C`
 * ("Sun Aug 30 17:36:43 2026"), which lets the trailing command line keep its own spaces.
 */
const PS_COMMAND_LINE = /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(\S+\s+\S+\s+\S+\s+\S+\s+\S+)\s+(.*)$/;

/** `comm` is a single trailing field, so an executable path may legitimately contain spaces. */
const PS_EXECUTABLE = /^\s*(\d+)\s+(.*)$/;

/**
 * Snapshots every process once, so the two commands can join listeners against their owner
 * without spawning a `ps` per PID. The executable path is read from `comm` rather than
 * sliced off the command line, because paths such as
 * `/Applications/Google Drive.app/Contents/MacOS/Google Drive` contain spaces.
 */
export async function fetchProcessTable(): Promise<Map<number, ProcessDetails>> {
  const [commandLines, executables] = await Promise.all([
    runCommand(PS, ["-Ao", "pid=,ppid=,user=,lstart=,command="]),
    runCommand(PS, ["-Ao", "pid=,comm="]),
  ]);

  const executableByPid = parseExecutables(executables.stdout);
  const table = new Map<number, ProcessDetails>();

  for (const line of commandLines.stdout.split("\n")) {
    const details = parseCommandLine(line, executableByPid);
    if (details) table.set(details.pid, details);
  }

  return table;
}

export function parseExecutables(output: string): Map<number, string> {
  const result = new Map<number, string>();

  for (const line of output.split("\n")) {
    const match = PS_EXECUTABLE.exec(line);
    if (!match) continue;

    const pid = Number(match[1]);
    if (!isValidPid(pid)) continue;

    result.set(pid, match[2].trim());
  }

  return result;
}

export function parseCommandLine(line: string, executables: Map<number, string>): ProcessDetails | null {
  const match = PS_COMMAND_LINE.exec(line);
  if (!match) return null;

  const pid = Number(match[1]);
  const ppid = Number(match[2]);
  if (!isValidPid(pid) || !Number.isSafeInteger(ppid) || ppid < 0) return null;

  const commandLine = match[5].trim();
  return {
    pid,
    ppid,
    user: match[3],
    started: match[4].replace(/\s+/g, " "),
    commandLine,
    executable: executables.get(pid) ?? "",
  };
}

/**
 * Reads the start time of a single process. Together with the PID this forms a fingerprint
 * that survives PID reuse, which matters because a PID captured when the list was built may
 * belong to a completely different process by the time the user presses a kill action.
 */
export async function fetchStartTime(pid: number): Promise<string | undefined> {
  if (!isValidPid(pid)) return undefined;

  const { stdout, exitCode } = await runCommand(PS, ["-o", "lstart=", "-p", String(pid)]);
  if (exitCode !== 0) return undefined;

  const started = stdout.trim().replace(/\s+/g, " ");
  return started.length > 0 ? started : undefined;
}
