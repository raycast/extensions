import { execFile } from "child_process";
import { statSync } from "fs";
import { promisify } from "util";

const run = promisify(execFile);

/**
 * The Codex plugin's `app-server-broker.mjs` trees, as Lancetta's Processes pane lists them
 * (`ProcessReaper`): one broker per working folder, with its children, and the memory they
 * hold. The broker has no idle timeout, so trees pile up; one whose folder no longer exists
 * is an orphan.
 *
 * Read-only on purpose. The app reads each broker's argv from the kernel, one string per
 * argument; `ps` joins the argv with spaces and quotes nothing, so a folder read out of it
 * can come out cut short -- "Mantine Extensions" read as ".../Mantine" -- and a cut folder
 * does not exist, which is what makes an orphan. That once had a live session signalled.
 * So this only reports, cutting the folder at the ` --pid-file` the plugin writes after it
 * and calling it unknown otherwise; Reclaim stays in the app, which reads the argv exactly
 * and checks the table again before it signals.
 */
const BROKER = "app-server-broker.mjs";

type Row = { pid: number; ppid: number; rssKB: number; args: string };

export type ProcessTree = {
  broker: number;
  /** The folder it was started for, or null when it cannot be told from `ps`. */
  cwd: string | null;
  children: number[];
  bytes: number;
  /** Its folder is gone. Never true for an unknown folder: unknown is not gone. */
  orphan: boolean;
};

function parse(output: string): Row[] {
  const rows: Row[] = [];
  for (const line of output.split("\n")) {
    const match = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/.exec(line);
    if (match) rows.push({ pid: +match[1], ppid: +match[2], rssKB: +match[3], args: match[4] });
  }
  return rows;
}

/** `… app-server-broker.mjs serve --endpoint … --cwd /abs/dir --pid-file …` -> `/abs/dir`. */
function brokerFolder(args: string): string | null {
  const match = /\s--cwd (\/.*?) --pid-file /.exec(args.slice(args.indexOf(BROKER)));
  return match ? match[1] : null;
}

/** Gone: nothing there, or a component on the way is not a folder. Any other failure is unknown, and unknown is not gone. */
function isGone(path: string): boolean {
  try {
    statSync(path);
    return false;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return code === "ENOENT" || code === "ENOTDIR";
  }
}

export async function scanProcesses(): Promise<ProcessTree[]> {
  const { stdout } = await run("/bin/ps", ["-axo", "pid=,ppid=,rss=,args="], { maxBuffer: 16 * 1024 * 1024 });
  const rows = parse(stdout);
  const byParent = new Map<number, Row[]>();
  for (const row of rows) {
    const siblings = byParent.get(row.ppid);
    if (siblings) siblings.push(row);
    else byParent.set(row.ppid, [row]);
  }
  const descendants = (pid: number, depth = 0): Row[] => {
    const kids = depth < 8 ? (byParent.get(pid) ?? []) : [];
    return kids.flatMap((kid) => [kid, ...descendants(kid.pid, depth + 1)]);
  };
  return rows
    .filter((row) => row.args.includes(BROKER))
    .map((broker) => {
      const kids = descendants(broker.pid);
      const cwd = brokerFolder(broker.args);
      return {
        broker: broker.pid,
        cwd,
        children: kids.map((k) => k.pid),
        bytes: (broker.rssKB + kids.reduce((sum, k) => sum + k.rssKB, 0)) * 1024,
        orphan: cwd !== null && isGone(cwd),
      };
    })
    .sort((a, b) => b.bytes - a.bytes);
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  return `${Math.round(bytes / 1024 ** 2)} MB`;
}
