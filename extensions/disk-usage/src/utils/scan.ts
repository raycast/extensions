import { spawn, exec } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import type { FileNode, FileSystemIndex, Volume } from "../types";
import { formatSize } from "./format";

const execAsync = promisify(exec);

const BLACKLIST_FOLDERS = ["node_modules", ".git", ".next", "dist", "build", "coverage"];

const BLACKLIST_REGEX = new RegExp(`\\/(${BLACKLIST_FOLDERS.join("|")})\\/`);

export const parseDuRecord = (line: string) => {
  const parts = line.trim().split(/\t/);
  if (parts.length < 2) return null;

  const kb = parseInt(parts[0], 10);
  const filePath = parts.slice(1).join("\t");

  return Number.isNaN(kb) ? null : { kb, path: filePath };
};

export const buildFileNode = (kb: number, rawPath: string, rootPath: string): FileNode | null => {
  if (!rawPath.startsWith(rootPath)) return null;

  const bytes = kb * 1024;

  return {
    path: rawPath,
    bytes: bytes,
    formattedSize: formatSize(bytes),
    name: path.basename(rawPath),
  };
};

export const indexHomeDirectory = (homeDir: string, onProgress: (path: string) => void): Promise<FileSystemIndex> =>
  new Promise((resolve, reject) => {
    const normalizedHome = path.normalize(homeDir);

    const accessibleByParent = new Map<string, FileNode[]>();
    const restrictedByParent = new Map<string, Set<string>>();

    const minSizeKb = 1024;
    let lastProgressTime = 0;
    const PROGRESS_THROTTLE_MS = 100;

    const addAccessible = (kb: number, rawPath: string) => {
      if (kb < minSizeKb || BLACKLIST_REGEX.test(rawPath)) return;

      const node = buildFileNode(kb, rawPath, normalizedHome);
      if (!node) return;

      const now = Date.now();
      if (now - lastProgressTime > PROGRESS_THROTTLE_MS) {
        onProgress(node.path);
        lastProgressTime = now;
      }

      const parent = path.normalize(path.dirname(node.path));

      const list = accessibleByParent.get(parent);
      if (list) list.push(node);
      else accessibleByParent.set(parent, [node]);
    };

    const addRestricted = (rawPath: string) => {
      if (BLACKLIST_REGEX.test(rawPath)) return;

      const normalizedPath = path.normalize(rawPath);
      const parent = path.normalize(path.dirname(normalizedPath));

      if (!parent.startsWith(normalizedHome) && parent !== normalizedHome) return;

      const list = restrictedByParent.get(parent);
      if (list) list.add(normalizedPath);
      else restrictedByParent.set(parent, new Set([normalizedPath]));
    };

    const du = spawn("du", ["-k", homeDir], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let leftover = "";
    let hasResolved = false;

    const finalize = () => {
      if (hasResolved) return;
      hasResolved = true;

      if (leftover.trim()) {
        const p = parseDuRecord(leftover);
        if (p) addAccessible(p.kb, p.path);
      }

      const result: FileSystemIndex = {};

      const allParents = new Set([...accessibleByParent.keys(), ...restrictedByParent.keys()]);

      for (const parentPath of allParents) {
        const accessible = (accessibleByParent.get(parentPath) || []).sort((a, b) => b.bytes - a.bytes);

        const deniedPaths = restrictedByParent.get(parentPath);

        console.log({ deniedPaths });

        const restricted = deniedPaths
          ? Array.from(deniedPaths).map((p) => ({
              path: p,
              bytes: 0,
              formattedSize: "Access Denied",
              name: path.basename(p),
            }))
          : [];

        if (accessible.length > 0 || restricted.length > 0) {
          result[parentPath] = { accessible, restricted };
        }
      }

      accessibleByParent.clear();
      restrictedByParent.clear();

      resolve(result);
    };

    du.stdout.on("data", (chunk) => {
      const lines = (leftover + chunk.toString("utf8")).split("\n");
      leftover = lines.pop() || "";
      for (const line of lines) {
        const p = parseDuRecord(line);
        if (p) addAccessible(p.kb, p.path);
      }
    });

    du.stderr.on("data", (chunk) => {
      const lines = chunk.toString("utf8").split("\n");
      for (const line of lines) {
        if (line.includes("Permission denied") || line.includes("Operation not permitted")) {
          const parts = line.split(/du:\s+/);
          if (parts.length > 1) {
            const pathPart = parts[1].split(":")[0];
            if (pathPart) addRestricted(pathPart.trim());
          }
        }
      }
    });

    du.on("error", (err) => !hasResolved && reject(err));

    du.on("close", (code) => {
      if (code && code > 1 && !hasResolved && accessibleByParent.size === 0) {
        hasResolved = true;
        reject(new Error(`Process exited with code ${code}`));
        return;
      }
      finalize();
    });
  });

export const fetchVolume = async (): Promise<Volume> => {
  const { stdout } = await execAsync("/usr/sbin/diskutil info /");

  const extractBytes = (pattern: string) =>
    Number(stdout.match(new RegExp(`${pattern}.*?\\((\\d+)\\s+Bytes\\)`))?.[1] ?? 0);

  const total = extractBytes("Container Total Space:");
  const free = extractBytes("Container Free Space:");
  const used = total - free;

  const percent = total > 0 ? Math.round((used / total) * 100) : 0;

  return {
    totalBytes: total,
    freeBytes: free,
    usageLabel: `${percent}%`,
  };
};
