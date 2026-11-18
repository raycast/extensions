import { spawn } from "node:child_process";
import { ensureFd } from "./binaries";

export interface ScanEntry {
  path: string;
  isDir: boolean;
}

// Walk the workspace once and return its files and dirs (absolute paths), tagged by
// type so the ranking can put folders first and render routes vs filenames correctly.
// Respects .gitignore/.fdignore and hides dotfiles, like fd's defaults. Read-only.
export async function scan(root: string): Promise<ScanEntry[]> {
  const fd = await ensureFd();
  const [dirs, files] = await Promise.all([runFd(fd, root, "d"), runFd(fd, root, "f")]);
  return [...dirs.map((path) => ({ path, isDir: true })), ...files.map((path) => ({ path, isDir: false }))];
}

function runFd(fd: string, root: string, type: "d" | "f"): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const child = spawn(fd, ["--print0", "--absolute-path", "--type", type, ".", root]);
    const chunks: Buffer[] = [];
    let stderr = "";
    child.stdout.on("data", (c) => chunks.push(c));
    child.stderr.on("data", (c) => (stderr += c));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(stderr.trim() || `fd exited with code ${code}`));
        return;
      }
      resolve(Buffer.concat(chunks).toString("utf8").split("\0").filter(Boolean));
    });
  });
}
