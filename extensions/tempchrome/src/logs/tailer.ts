import * as fs from "node:fs";
import { StringDecoder } from "node:string_decoder";

import { reportError } from "../utils/reportError";
import { parseChromiumLog, type LogRow } from "./parser";

const POLL_INTERVAL_MS = 250;
const INITIAL_SKIP_THRESHOLD_BYTES = 5 * 1024 * 1024;
const PARTIAL_LINE_MAX_BYTES = 64 * 1024;

export type TailerStateChange = {
  fileMissing?: boolean;
  truncated?: boolean;
  skippedOlder?: boolean;
};

export type TailerOptions = {
  logPath: string;
  onLines: (rows: LogRow[]) => void;
  onStateChange: (change: TailerStateChange) => void;
};

export type TailerHandle = {
  start: () => void;
  stop: () => void;
};

export function createTailer(options: TailerOptions): TailerHandle {
  const { logPath, onLines, onStateChange } = options;

  let intervalId: ReturnType<typeof setInterval> | null = null;
  let firstTick = true;
  let storedOffset = 0;
  let storedIno: number | null = null;
  let partialLine = "";
  let decoder = new StringDecoder("utf8");
  let tickInFlight = false;
  let stopped = false;

  function resetStreamState(): void {
    storedOffset = 0;
    partialLine = "";
    decoder = new StringDecoder("utf8");
  }

  async function readRange(from: number, to: number): Promise<Buffer | null> {
    if (to <= from) {
      return Buffer.alloc(0);
    }
    let handle: fs.promises.FileHandle | null = null;
    try {
      handle = await fs.promises.open(logPath, "r");
      const length = to - from;
      const buffer = Buffer.alloc(length);
      const { bytesRead } = await handle.read(buffer, 0, length, from);
      return bytesRead < length ? buffer.subarray(0, bytesRead) : buffer;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        return null;
      }
      await reportError("Log tail read failed", error, { silent: true });
      return null;
    } finally {
      if (handle) {
        try {
          await handle.close();
        } catch (error) {
          await reportError("Log tail handle close failed", error, { silent: true });
        }
      }
    }
  }

  async function findNewlineAfter(from: number, size: number): Promise<number> {
    const chunkSize = 64 * 1024;
    let cursor = from;
    while (cursor < size) {
      const end = Math.min(size, cursor + chunkSize);
      const buffer = await readRange(cursor, end);
      if (!buffer) {
        return size;
      }
      const index = buffer.indexOf(0x0a);
      if (index !== -1) {
        return cursor + index + 1;
      }
      cursor = end;
    }
    return size;
  }

  function emitRowsFromChunk(chunk: Buffer): void {
    const decoded = decoder.write(chunk);
    const combined = partialLine + decoded;
    const segments = combined.split("\n");
    partialLine = segments.pop() ?? "";

    const rows: LogRow[] = segments.map((segment) => parseChromiumLog(segment));

    if (partialLine.length > PARTIAL_LINE_MAX_BYTES) {
      rows.push({
        type: "raw",
        text: `${partialLine} ⚠ truncated`,
        severity: "RAW",
      });
      partialLine = "";
    }

    if (rows.length > 0) {
      onLines(rows);
    }
  }

  async function tick(): Promise<void> {
    if (stopped || tickInFlight) {
      return;
    }
    tickInFlight = true;
    try {
      let stats: fs.Stats;
      try {
        stats = await fs.promises.stat(logPath);
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "ENOENT") {
          onStateChange({ fileMissing: true });
          return;
        }
        await reportError("Log tail stat failed", error, { silent: true });
        return;
      }

      const size = stats.size;
      const ino = stats.ino;

      if (firstTick) {
        firstTick = false;
        storedIno = ino;
        if (size > INITIAL_SKIP_THRESHOLD_BYTES) {
          const seekStart = size - INITIAL_SKIP_THRESHOLD_BYTES;
          storedOffset = await findNewlineAfter(seekStart, size);
          onStateChange({ skippedOlder: true });
        } else {
          storedOffset = 0;
        }
      }

      if (storedIno !== null && ino !== storedIno) {
        storedIno = ino;
        resetStreamState();
        onStateChange({ truncated: true });
      } else if (size < storedOffset) {
        resetStreamState();
        onStateChange({ truncated: true });
      }

      if (size <= storedOffset) {
        return;
      }

      const buffer = await readRange(storedOffset, size);
      if (!buffer) {
        return;
      }
      storedOffset += buffer.length;
      emitRowsFromChunk(buffer);
    } finally {
      tickInFlight = false;
    }
  }

  return {
    start(): void {
      if (intervalId !== null) {
        return;
      }
      stopped = false;
      void tick();
      intervalId = setInterval(() => {
        void tick();
      }, POLL_INTERVAL_MS);
    },
    stop(): void {
      stopped = true;
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
  };
}
