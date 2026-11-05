import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";
import type { Counters, RawSample } from "../types";

function csvFields(line: string): string[] {
  const fields: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (char === "," && !quoted) {
      fields.push(value);
      value = "";
    } else value += char;
  }
  if (quoted) throw new Error("nettop returned an incomplete CSV row.");
  fields.push(value);
  return fields;
}

/** Headers and process exit delimit frames; pauses in stdout do not. */
export class NettopDecoder {
  private buffer = "";
  private columns: { incoming: number; outgoing: number } | null = null;
  private sample: RawSample | null = null;

  constructor(private readonly onSample: (sample: RawSample) => void) {}

  push(chunk: string, timestamp = Date.now(), monotonicMs = performance.now()) {
    this.buffer += chunk;
    if (this.buffer.length > 4 * 1024 * 1024) throw new Error("nettop returned an oversized CSV frame.");
    this.flush(timestamp, monotonicMs);
  }

  /** Parse complete rows while keeping the current sample open for later rows. */
  flush(timestamp = Date.now(), monotonicMs = performance.now()) {
    let end: number;
    while ((end = this.buffer.indexOf("\n")) !== -1) {
      // script emits an EOF keystroke when its stdin is /dev/null.
      const line = this.buffer.slice(0, end).replaceAll("^D\b\b", "").trim();
      this.buffer = this.buffer.slice(end + 1);
      if (!line) continue;
      const fields = csvFields(line);
      if (fields[0] === "") {
        this.finishSample();
        const incoming = fields.indexOf("bytes_in");
        const outgoing = fields.indexOf("bytes_out");
        if (incoming < 0 || outgoing < 0) throw new Error("nettop output is missing bytes_in or bytes_out.");
        this.columns = { incoming, outgoing };
        this.sample = { timestamp, monotonicMs, rows: [] };
        continue;
      }
      if (!this.columns || !this.sample) throw new Error("Unexpected nettop output. Try opening Network Hogs again.");
      const match = /^(.*)\.(\d+)$/.exec(fields[0]);
      if (!match) throw new Error("nettop returned a process without a PID.");
      const values = [fields[this.columns.incoming], fields[this.columns.outgoing]];
      if (values.some((value) => !value || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)))) {
        throw new Error("nettop returned an invalid byte counter.");
      }
      const row: Counters = {
        name: match[1],
        pid: Number(match[2]),
        bytesIn: Number(values[0]),
        bytesOut: Number(values[1]),
      };
      if (!Number.isSafeInteger(row.pid) || row.pid < 1) throw new Error("nettop returned an invalid PID.");
      this.sample.rows.push(row);
    }
  }

  end() {
    if (this.buffer.trim()) this.push("\n");
    this.finishSample();
  }

  private finishSample() {
    if (this.sample) {
      const sample = this.sample;
      this.sample = null;
      this.onSample(sample);
    }
  }
}

export function startNettop(options: {
  intervalSeconds: number;
  sampleCount?: number;
  onSample: (sample: RawSample) => void;
  onError: (error: Error) => void;
  onEnd?: () => void;
}): () => void {
  if (process.platform !== "darwin") throw new Error("Network Hogs requires macOS.");
  const child = spawn(
    "/usr/bin/script",
    [
      "-q",
      "/dev/null",
      "/usr/bin/nettop",
      "-n",
      "-P",
      "-x",
      "-L",
      String(options.sampleCount ?? 0),
      "-s",
      String(options.intervalSeconds),
      "-J",
      "bytes_in,bytes_out",
    ],
    // A PTY prevents nettop's stdio buffering from delaying the first result.
    // An isolated process group lets cleanup terminate both script and nettop.
    { detached: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, LC_ALL: "C" } },
  );
  let stopped = false;
  let stderr = "";
  let watchdog: NodeJS.Timeout | undefined;
  const decoder = new NettopDecoder(options.onSample);

  function killGroup() {
    if (!child.pid) return;
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ESRCH")) throw error;
    }
  }

  function stop() {
    if (stopped) return;
    stopped = true;
    clearTimeout(watchdog);
    process.off("exit", killGroup);
    killGroup();
  }

  function fail(error: Error) {
    if (stopped) return;
    stop();
    options.onError(error);
  }

  function armWatchdog() {
    clearTimeout(watchdog);
    watchdog = setTimeout(() => fail(new Error("Network sampling stopped responding. Try resuming monitoring.")), 8000);
  }

  process.once("exit", killGroup);
  armWatchdog();
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    if (stopped) return;
    armWatchdog();
    try {
      decoder.push(chunk);
    } catch (error) {
      fail(error instanceof Error ? error : new Error(String(error)));
    }
  });
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    stderr = (stderr + chunk).slice(-4096);
  });
  child.on("error", fail);
  child.on("close", (code) => {
    if (stopped) return;
    if (code !== 0) {
      fail(new Error(stderr.trim() || `nettop exited with status ${code}.`));
      return;
    }
    try {
      decoder.end();
    } catch (error) {
      fail(error instanceof Error ? error : new Error(String(error)));
      return;
    }
    stop();
    if (options.sampleCount) options.onEnd?.();
    else options.onError(new Error("Network sampling ended unexpectedly. Resume to try again."));
  });
  return stop;
}
