// The nettop stream: detached 5-minute chunks whose finished samples are read back every tick.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { alive, sh } from "./proc.ts";
import { NET, parseStream } from "./nettop.ts";
import type { Row } from "./nettop.ts";
import type { Chunk } from "./store.ts";

export const STEP_S = 2;
export const CHUNK_SAMPLES = 151; // first sample is cumulative, 150 deltas ≈ 5 min
export const MANUAL_SAMPLES = 16; // ≈ 30 s
export const HANDOVER_MS = 12_000; // start the next chunk this long before the current one ends

// A chunk runs until nettop exits or its time is up; after that its pid may already belong to someone else.
export function running(c: Chunk, now: number) {
  return now <= c.until + 5000 && alive(c.pid);
}

// ---------- stream ----------

export async function startChunk(dir: string, now: number, samples: number, manual = false): Promise<Chunk> {
  const fifo = path.join(dir, "stdin.fifo");
  let isFifo = false;
  try {
    isFifo = fs.statSync(fifo).isFIFO();
  } catch {
    // fifo does not exist yet
  }
  if (!isFifo) {
    fs.rmSync(fifo, { force: true });
    await sh("/usr/bin/mkfifo", [fifo]);
  }
  const file = path.join(dir, `stream-${now}.csv`);
  let inFd = -1;
  let outFd = -1;
  try {
    inFd = fs.openSync(fifo, "r+"); // nettop holds both ends, so its stdin never reaches EOF
    outFd = fs.openSync(file, "w");
    const args = [
      "-n",
      "10",
      NET,
      "-P",
      "-d",
      "-s",
      String(STEP_S),
      "-L",
      String(samples),
      "-x",
      "-t",
      "wifi",
      "-t",
      "wired",
      "-J",
      "time,bytes_in,bytes_out,re-tx",
    ];
    const child = spawn("/usr/bin/nice", args, { detached: true, stdio: [inFd, outFd, "ignore"] });
    child.on("error", () => {});
    child.unref();
    if (!child.pid) throw new Error("nettop did not start"); // never store pid 0: kill(0) would hit our own group
    return {
      pid: child.pid,
      start: now,
      until: now + samples * STEP_S * 1000 + 2000,
      file,
      offset: 0,
      ...(manual ? { manual } : {}),
    };
  } finally {
    if (inFd >= 0) fs.closeSync(inFd);
    if (outFd >= 0) fs.closeSync(outFd);
  }
}

// Complete samples written since the last read. A sample is complete once the next header follows it
// (or the process has exited); the offset stays at the first incomplete header.
export function drain(c: Chunk, ended: boolean): Row[][] {
  let buf: Buffer;
  try {
    const fd = fs.openSync(c.file, "r");
    buf = Buffer.alloc(Math.max(0, fs.fstatSync(fd).size - c.offset));
    fs.readSync(fd, buf, 0, buf.length, c.offset);
    fs.closeSync(fd);
  } catch {
    return [];
  }
  let end = buf.length;
  if (!ended) {
    const i = buf.lastIndexOf("\ntime,");
    if (i < 0) return [];
    end = i + 1;
  }
  c.offset += end;
  return parseStream(buf.subarray(0, end).toString("utf8"));
}

export function clockMs(time: string, around: number): number {
  const m = /^(\d+):(\d+):(\d+)(?:\.(\d+))?/.exec(time);
  if (!m) return around;
  const d = new Date(around);
  d.setHours(+m[1], +m[2], +m[3], m[4] ? Math.round(Number("0." + m[4]) * 1000) : 0);
  const day = 24 * 3600 * 1000;
  const t = d.getTime();
  return t - Math.round((t - around) / day) * day; // the day nearest to `around`: handles midnight
}
