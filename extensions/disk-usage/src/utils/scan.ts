import { exec, spawn } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import type { FileNode, Volume } from "../types";
import { formatSize } from "./format";
import { initStorage, saveGlobalSearchIndex, upsertDirectorySnapshot } from "./storage";

const execAsync = promisify(exec);

const BLACKLIST_FOLDERS = [
  "node_modules",
  "\\.git",
  "\\.next",
  "dist",
  "coverage",
  "com\\.raycast\\.macos",
  "\\.vscode",
  "\\.DS_Store",
];

const BLACKLIST_REGEX = new RegExp(`\\/(${BLACKLIST_FOLDERS.join("|")})(\\/|$)`, "i");

const TOP_FILES_PER_FOLDER = 100;
const MAX_GLOBAL_SEARCH_ITEMS = 1000;
const MIN_SIZE_KB = 1024;

export const fetchVolume = async (): Promise<Volume> => {
  try {
    const { stdout } = await execAsync("/usr/sbin/diskutil info /");
    const extractBytes = (pattern: string): number => {
      const match = stdout.match(new RegExp(`${pattern}.*?\\((\\d+)\\s+Bytes\\)`));
      return match?.[1] ? Number(match[1]) : 0;
    };
    const total = extractBytes("Container Total Space:") || extractBytes("Total Space:");
    const free = extractBytes("Container Free Space:") || extractBytes("Free Space:");
    const used = total - free;
    const percent = total > 0 ? Math.round((used / total) * 100) : 0;
    return { totalBytes: total, freeBytes: free, usageLabel: `${percent}%` };
  } catch {
    return { totalBytes: 0, freeBytes: 0, usageLabel: "?" };
  }
};

interface DuRecord {
  kb: number;
  path: string;
}

const parseDuRecord = (line: string): DuRecord | null => {
  const tabIndex = line.indexOf("\t");
  if (tabIndex === -1) return null;
  const kb = parseInt(line.slice(0, tabIndex), 10);
  if (Number.isNaN(kb)) return null;
  return { kb, path: line.slice(tabIndex + 1) };
};

export const indexHomeDirectory = async (
  homeDir: string,
  onProgress: (path: string, heap: string) => void,
): Promise<void> => {
  await initStorage();

  const du = spawn("du", ["-k", "-P", "-x", homeDir], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  const buffer = new Map<string, FileNode[]>();
  const restricted = new Map<string, FileNode[]>();
  const globalTopFiles: FileNode[] = [];

  const exitPromise = new Promise<void>((resolve, reject) => {
    du.on("close", (code) => {
      if (code !== 0 && code !== 1) {
        reject(new Error(`Scan failed with code ${code}`));
      } else {
        resolve();
      }
    });
    du.on("error", reject);
  });

  const flushBuffer = async () => {
    if (buffer.size === 0 && restricted.size === 0) return;

    const pathsToProcess = Array.from(buffer.keys());
    const bufferSnapshot = new Map(buffer);
    const restrictedSnapshot = new Map(restricted);

    buffer.clear();
    restricted.clear();

    for (const dirPath of pathsToProcess) {
      const files = bufferSnapshot.get(dirPath) || [];
      const restrictedFiles = restrictedSnapshot.get(dirPath) || [];

      files.sort((a, b) => b.bytes - a.bytes);
      const topFiles = files.slice(0, TOP_FILES_PER_FOLDER);

      if (topFiles.length > 0 || restrictedFiles.length > 0) {
        await upsertDirectorySnapshot(dirPath, {
          accessible: topFiles,
          restricted: restrictedFiles,
        });
      }
    }
  };

  du.stderr.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    const lines = text.split("\n");
    for (const line of lines) {
      const match = line.match(/du:\s+(.+?):\s+(Permission denied|Operation not permitted)/);
      if (match?.[1]) {
        const deniedPath = match[1];
        const parent = path.dirname(deniedPath);
        if (!restricted.has(parent)) restricted.set(parent, []);
        restricted.get(parent)?.push({
          path: deniedPath,
          bytes: 0,
          formattedSize: "Access Denied",
          name: path.basename(deniedPath),
        });
      }
    }
  });

  try {
    let lineBuffer = "";
    let lastProgress = Date.now();

    for await (const chunk of du.stdout) {
      lineBuffer += chunk.toString("utf8");
      const lines = lineBuffer.split("\n");
      lineBuffer = lines.pop() || "";

      for (const line of lines) {
        const p = parseDuRecord(line);
        if (!p || p.kb < MIN_SIZE_KB || BLACKLIST_REGEX.test(p.path)) continue;

        const parent = path.dirname(p.path);
        const bytes = p.kb * 1024;

        const node: FileNode = {
          path: p.path,
          bytes,
          formattedSize: formatSize(bytes),
          name: path.basename(p.path),
        };

        if (!buffer.has(parent)) buffer.set(parent, []);
        buffer.get(parent)?.push(node);

        globalTopFiles.push(node);

        const now = Date.now();
        if (now - lastProgress > 100) {
          const memUsage = process.memoryUsage().heapUsed / 1024 / 1024;
          onProgress(p.path, `${memUsage.toFixed(1)} MB`);
          lastProgress = now;
        }
      }

      if (globalTopFiles.length > MAX_GLOBAL_SEARCH_ITEMS * 3) {
        globalTopFiles.sort((a, b) => b.bytes - a.bytes);
        globalTopFiles.splice(MAX_GLOBAL_SEARCH_ITEMS * 2);
      }
      if (buffer.size > 200) {
        await flushBuffer();
      }
    }
  } catch (err) {
    du.kill();
    throw err;
  }

  await exitPromise;

  await flushBuffer();

  globalTopFiles.sort((a, b) => b.bytes - a.bytes);
  await saveGlobalSearchIndex(globalTopFiles.slice(0, MAX_GLOBAL_SEARCH_ITEMS));
};
