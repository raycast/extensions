import { exec, spawn } from "node:child_process";
import { once } from "node:events";
import { basename, dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";
import type { FileNode, Volume } from "../types";
import { formatSize } from "./format";
import { initStorage, saveGlobalSearchIndex, upsertDirectorySnapshot } from "./storage";

const execAsync = promisify(exec);

interface LightNode {
  n: string;
  b: number;
}
interface LightEntry {
  path: string;
  kb: number;
}

interface ScanState {
  buffer: Map<string, LightNode[]>;
  bufferItemCount: number;
  restricted: Map<string, FileNode[]>;
  globalTopFiles: FileNode[];
  lastProgress: number;
}

export const fetchVolume = async (): Promise<Volume> => {
  try {
    const { stdout } = await execAsync("/usr/sbin/diskutil info /");
    const parseBytes = (pattern: RegExp) => {
      const match = stdout.match(pattern);
      return match ? parseInt(match[1], 10) : 0;
    };

    const total =
      parseBytes(/Container Total Space:.*?\((\d+)\s+Bytes\)/) || parseBytes(/Total Space:.*?\((\d+)\s+Bytes\)/);
    const free =
      parseBytes(/Container Free Space:.*?\((\d+)\s+Bytes\)/) || parseBytes(/Free Space:.*?\((\d+)\s+Bytes\)/);
    const percent = total > 0 ? Math.round(((total - free) / total) * 100) : 0;

    return { totalBytes: total, freeBytes: free, usageLabel: total ? `${percent}%` : "?" };
  } catch {
    return { totalBytes: 0, freeBytes: 0, usageLabel: "?" };
  }
};

const parseLine = (line: string): LightEntry | null => {
  const blacklistPattern = new RegExp(
    `/(${[
      "node_modules",
      "\\.git",
      "\\.next",
      "dist",
      "coverage",
      "\\.vscode",
      "\\.DS_Store",
      "com\\.raycast\\.macos",
    ].join("|")})(/|$)`,
    "i",
  );
  const minFileSizeKB = 1024;

  const tabIndex = line.indexOf("\t");
  if (tabIndex === -1) return null;

  const kb = parseInt(line.slice(0, tabIndex), 10);
  if (Number.isNaN(kb) || kb < minFileSizeKB) return null;

  const rawPath = line.slice(tabIndex + 1);
  if (blacklistPattern.test(rawPath)) return null;

  return { path: rawPath, kb };
};

const flushStateToStorage = async (state: ScanState, force = false): Promise<void> => {
  const flushDirThreshold = 3;
  const flushItemThreshold = 2000;
  const topFilesPerDir = 100;

  if (!force && state.buffer.size < flushDirThreshold && state.bufferItemCount < flushItemThreshold) return;

  const tasks: Promise<void>[] = [];

  for (const [parent, lightFiles] of state.buffer) {
    const restrictedFiles = state.restricted.get(parent) || [];
    state.restricted.delete(parent);

    lightFiles.sort((a, b) => b.b - a.b);
    const topLight = lightFiles.slice(0, topFilesPerDir);

    const accessible: FileNode[] = [];
    for (let i = 0; i < topLight.length; i++) {
      const f = topLight[i];
      accessible.push({
        path: join(parent, f.n),
        name: f.n,
        bytes: f.b,
        formattedSize: formatSize(f.b),
      });
    }

    tasks.push(
      upsertDirectorySnapshot(parent, {
        accessible,
        restricted: restrictedFiles,
      }),
    );
  }

  if (force && state.restricted.size > 0) {
    for (const [parent, restrictedFiles] of state.restricted) {
      tasks.push(upsertDirectorySnapshot(parent, { accessible: [], restricted: restrictedFiles }));
    }
    state.restricted.clear();
  }

  state.buffer.clear();
  state.bufferItemCount = 0;

  await Promise.all(tasks);
};

const trackErrors = async (stream: NodeJS.ReadableStream, state: ScanState): Promise<string> => {
  const stderrLogLimit = 2000;
  let log = "";
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    log = `${log}${line}\n`.slice(-stderrLogLimit);

    if (!line.includes("denied") && !line.includes("permitted")) continue;

    const match = line.match(/du:\s+(.+?):\s+(Permission denied|Operation not permitted)/);
    if (match?.[1]) {
      const p = match[1];
      const parent = dirname(p);

      let list = state.restricted.get(parent);
      if (!list) {
        list = [];
        state.restricted.set(parent, list);
      }

      list.push({
        path: p,
        bytes: 0,
        formattedSize: "Access Denied",
        name: basename(p),
      });
    }
  }
  return log;
};

async function* streamDuOutput(stream: NodeJS.ReadableStream): AsyncGenerator<LightEntry> {
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    const entry = parseLine(line);
    if (entry) yield entry;
  }
}

const consumeAndIndex = async (
  iterator: AsyncIterable<LightEntry>,
  state: ScanState,
  onProgress: (path: string, heap: string) => void,
): Promise<void> => {
  const maxGlobalFiles = 1000;
  const globalSortAt = 1300;
  const progressIntervalMs = 100;

  for await (const entry of iterator) {
    const bytes = entry.kb * 1024;
    const parent = dirname(entry.path);
    const name = basename(entry.path);

    let dirBuffer = state.buffer.get(parent);
    if (!dirBuffer) {
      dirBuffer = [];
      state.buffer.set(parent, dirBuffer);
    }

    dirBuffer.push({ n: name, b: bytes });
    state.bufferItemCount++;

    if (state.globalTopFiles.length < maxGlobalFiles) {
      state.globalTopFiles.push({
        path: entry.path,
        bytes,
        name,
        formattedSize: formatSize(bytes),
      });
    } else {
      const minBytes = state.globalTopFiles[state.globalTopFiles.length - 1].bytes;
      if (bytes > minBytes) {
        state.globalTopFiles.push({
          path: entry.path,
          bytes,
          name,
          formattedSize: formatSize(bytes),
        });
      }
    }

    if (state.globalTopFiles.length > globalSortAt) {
      state.globalTopFiles.sort((a, b) => b.bytes - a.bytes);
      state.globalTopFiles.length = maxGlobalFiles;
    }

    const now = Date.now();
    if (now - state.lastProgress > progressIntervalMs) {
      await flushStateToStorage(state);

      const heap = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(0);
      onProgress(entry.path, `${heap} MB`);
      state.lastProgress = now;
    }
  }
};

export const indexHomeDirectory = async (
  homeDir: string,
  onProgress: (path: string, heap: string) => void,
): Promise<void> => {
  const maxGlobalFiles = 3000;

  await initStorage();
  const ac = new AbortController();

  const state: ScanState = {
    buffer: new Map(),
    bufferItemCount: 0,
    restricted: new Map(),
    globalTopFiles: [],
    lastProgress: 0,
  };

  const du = spawn("du", ["-k", "-P", "-x", homeDir], {
    stdio: ["ignore", "pipe", "pipe"],
    signal: ac.signal,
  });

  const stderrPromise = trackErrors(du.stderr, state);
  const closePromise = once(du, "close");

  try {
    await pipeline(streamDuOutput(du.stdout), (source) => consumeAndIndex(source, state, onProgress));

    const [exitCode] = await closePromise;

    await flushStateToStorage(state, true);

    const stderrLog = await stderrPromise;

    state.globalTopFiles.sort((a, b) => b.bytes - a.bytes);
    await saveGlobalSearchIndex(state.globalTopFiles.slice(0, maxGlobalFiles));

    state.buffer.clear();
    state.restricted.clear();
    state.globalTopFiles.length = 0;

    if (exitCode !== 0 && exitCode !== 1 && exitCode !== null) {
      console.warn(`DU scan warning (code ${exitCode}):\n${stderrLog.slice(-1000)}`);
    }
  } catch (err) {
    ac.abort();
    throw err;
  }
};
