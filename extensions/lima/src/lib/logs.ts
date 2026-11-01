import { access, open } from "node:fs/promises";
import { join } from "node:path";
import { Instance, isRunning } from "./instance";
import { inInstanceCommand, quote, runInInstance } from "./lima";

/** Lima has no logs command. These are the three logs an instance has, side by side. */
export type LogSource = "lima" | "console" | "provision";

export type Level = "error" | "warn" | "info" | "debug";

export interface LogLine {
  /** "17:37:02", in this Mac's time zone. */
  time?: string;
  level?: Level;
  text: string;
}

export interface Log {
  source: LogSource;
  lines: LogLine[];
  /** The file on this Mac, for the Lima and Console logs. */
  path?: string;
  /** Why there's nothing to show, like an instance that isn't running. */
  unavailable?: string;
}

/** How many lines a log shows. Follow in Terminal has the rest. */
export const SHOWN_LINES = 200;

/** Read from the end of a file, so a big log doesn't load whole. */
const TAIL_BYTES = 256 * 1024;

/** Where provision scripts print, inside the instance. */
const PROVISION_LOG = "/var/log/cloud-init-output.log";

export const SOURCE_TITLES: Record<LogSource, string> = { lima: "Lima", console: "Console", provision: "Provision" };

/** The last `count` lines of a file, or all of it. */
async function readTail(path: string, count: number | "all"): Promise<string[]> {
  const file = await open(path, "r");
  try {
    const { size } = await file.stat();
    const start = count === "all" ? 0 : Math.max(0, size - TAIL_BYTES);
    const buffer = Buffer.alloc(size - start);
    await file.read(buffer, 0, buffer.length, start);
    const lines = buffer.toString("utf8").split("\n");
    // A read that starts mid-file starts mid-line.
    if (start > 0) lines.shift();
    if (lines.at(-1) === "") lines.pop();
    return count === "all" ? lines : lines.slice(-count);
  } finally {
    await file.close();
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function clockTime(iso: string): string | undefined {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : date.toLocaleTimeString("en-GB", { hour12: false });
}

/** Lima's host agent logs JSON, one object a line: `{"level":"info","msg":"…","time":"…"}`. */
function parseLimaLine(raw: string): LogLine {
  try {
    const entry = JSON.parse(raw) as { level?: string; msg?: string; time?: string; error?: string };
    const level = (["error", "warn", "info", "debug"] as Level[]).find((name) => entry.level?.startsWith(name));
    const fatal = entry.level === "fatal" || entry.level === "panic";
    const text = [entry.msg, entry.error].filter(Boolean).join(": ");
    return { time: entry.time ? clockTime(entry.time) : undefined, level: fatal ? "error" : level, text: text || raw };
  } catch {
    return { text: raw };
  }
}

/** Terminal escape codes and carriage returns, which the serial console is full of. */
// eslint-disable-next-line no-control-regex
const ESCAPES = /\x1b\[[0-9;?!]*[ -/]*[@-~]|\x1b[\]P][\s\S]*?(?:\x07|\x1b\\)|\x1b[@-_]|\r/g;

/** Provision output has no levels, so they're read from the words apt, sh and Lima use. */
function guessLevel(text: string): Level | undefined {
  if (/^E: |\b(error|failed|fatal)\b|exiting with code [1-9]/i.test(text)) return "error";
  if (/^W: |\bwarn(ing)?\b/i.test(text)) return "warn";
  return undefined;
}

function plainLines(raw: string[]): LogLine[] {
  return raw
    .map((line) => line.replace(ESCAPES, "").trimEnd())
    .flatMap((text) => (text ? [{ text, level: guessLevel(text) }] : []));
}

/** The serial console's file: serialv.log for VZ, serial.log or serialp.log for QEMU. */
async function consolePath(instance: Instance): Promise<string | undefined> {
  for (const name of ["serialv.log", "serial.log", "serialp.log"]) {
    const path = join(instance.dir, name);
    if (await exists(path)) return path;
  }
  return undefined;
}

export async function readLog(
  instance: Instance,
  source: LogSource,
  count: number | "all" = SHOWN_LINES,
): Promise<Log> {
  if (source === "lima") {
    const path = join(instance.dir, "ha.stderr.log");
    if (!(await exists(path))) return { source, lines: [], unavailable: "Lima hasn't written this log yet." };
    return { source, path, lines: (await readTail(path, count)).filter(Boolean).map(parseLimaLine) };
  }
  if (source === "console") {
    const path = await consolePath(instance);
    if (!path) return { source, lines: [], unavailable: "There's no console log until the instance has started once." };
    return { source, path, lines: plainLines(await readTail(path, count)) };
  }
  if (!isRunning(instance)) {
    return { source, lines: [], unavailable: `The provision log is inside the VM. Start ${instance.name} to read it.` };
  }
  const tail = count === "all" ? ["cat", PROVISION_LOG] : ["tail", "-n", String(count), PROVISION_LOG];
  const stdout = await runInInstance(instance.name, ["sudo", "-n", ...tail]);
  return { source, lines: plainLines(stdout.split("\n")) };
}

/** All three, each on its own, so one that fails doesn't hide the others. */
export async function readLogs(instance: Instance): Promise<Record<LogSource, Log>> {
  const sources: LogSource[] = ["lima", "console", "provision"];
  const logs = await Promise.all(
    sources.map((source) =>
      readLog(instance, source).catch((error): Log => ({
        source,
        lines: [],
        unavailable: error instanceof Error ? error.message : String(error),
      })),
    ),
  );
  return { lima: logs[0], console: logs[1], provision: logs[2] };
}

/**
 * Drops terminal escape codes as lines arrive, like ESCAPES. Left in, the terminal runs them:
 * the console's cursor queries make it type its answers (^[[5;1R) into the window.
 * Perl because it's on every Mac and can unbuffer; macOS sed can't match an escape.
 */
const STRIP_ESCAPES = String.raw`perl -pe 'BEGIN { $| = 1 } s/\e\[[0-9;?!]*[ -\/]*[@-~]|\e[\]P].*?(?:\a|\e\\)|\e[@-_]|\r//g'`;

/** Lima's JSON lines as time, level and message, like Show Logs shows them. Anything else passes through. */
const FORMAT_LIMA = String.raw`perl -MJSON::PP -ne 'BEGIN { $| = 1 } my $e = eval { decode_json($_) }; if (ref $e eq "HASH") { my ($t) = ($e->{time} // "") =~ /T(\d\d:\d\d:\d\d)/; print join(" ", grep { defined && length } $t, $e->{level}, $e->{msg}, $e->{error}), "\n" } else { print }'`;

/** The command Follow in Terminal runs: tail -f on the file, or inside the instance, cleaned up for a terminal. */
export function followCommand(instance: Instance, log: Log): string {
  if (log.source === "lima" && log.path) return `tail -n ${SHOWN_LINES} -f ${quote(log.path)} | ${FORMAT_LIMA}`;
  if (log.path) return `tail -n ${SHOWN_LINES} -f ${quote(log.path)} | ${STRIP_ESCAPES}`;
  return `${inInstanceCommand(instance.name, `sudo tail -n ${SHOWN_LINES} -f ${PROVISION_LOG}`)} | ${STRIP_ESCAPES}`;
}

/** "17:37:02 error Failed to forward…", as the lines are copied. */
export function lineText(line: LogLine): string {
  return [line.time, line.level, line.text].filter(Boolean).join(" ");
}
