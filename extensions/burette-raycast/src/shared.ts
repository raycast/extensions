import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { readdir, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";

export const STRUCTURE_EXTENSIONS = new Set([
  ".pdb", ".ent", ".cif", ".mmcif", ".sdf", ".sd", ".mol", ".mol2",
  ".xyz", ".gro", ".dcd", ".xtc", ".trr", ".pqr", ".mmtf", ".mvsj", ".mvsx",
]);

export type StructureFile = { path: string; name: string; modifiedAt: number; size: number };

type Preferences = { searchRoots?: string; buretteAppName?: string; cliPath?: string };

export function preferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function expandPath(value: string): string {
  return resolve(value.trim().replace(/^~(?=$|\/)/, homedir()));
}

export function configuredRoots(): string[] {
  const raw = preferences().searchRoots || "~/Documents,~/Downloads,~/Desktop";
  return raw.split(",").map(expandPath).filter(Boolean);
}

export async function findStructures(roots = configuredRoots(), maxDepth = 4): Promise<StructureFile[]> {
  const result: StructureFile[] = [];
  const visit = async (directory: string, depth: number): Promise<void> => {
    if (depth > maxDepth || result.length >= 500) return;
    let entries;
    try { entries = await readdir(directory, { withFileTypes: true }); } catch { return; }
    await Promise.all(entries.map(async (entry) => {
      if (entry.name.startsWith(".")) return;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return visit(path, depth + 1);
      if (!STRUCTURE_EXTENSIONS.has(entry.name.slice(entry.name.lastIndexOf(".")).toLowerCase())) return;
      try {
        const metadata = await stat(path);
        result.push({ path, name: entry.name, modifiedAt: metadata.mtimeMs, size: metadata.size });
      } catch { /* file can disappear during a scan */ }
    }));
  };
  await Promise.all(roots.map((root) => visit(root, 0)));
  return result.sort((a, b) => b.modifiedAt - a.modifiedAt).slice(0, 500);
}

export async function openInBurette(path: string): Promise<void> {
  const appName = preferences().buretteAppName || "Burette";
  const appResult = await run("open", ["-a", appName, path]);
  if (appResult.code === 0) return;
  const cliPath = preferences().cliPath?.trim();
  if (cliPath) {
    const cliResult = await run("bun", [expandPath(cliPath), "open", "--mode", "desktop-app", path]);
    if (cliResult.code === 0) return;
  }
  throw new Error(appResult.stderr || `Could not open ${path} in ${appName}`);
}

export async function openWithToast(path: string): Promise<void> {
  try {
    await openInBurette(path);
    await showToast({ style: Toast.Style.Success, title: "Opened in Burette", message: path.split("/").pop() });
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Could not open in Burette", message: String(error) });
  }
}

function run(command: string, args: string[]): Promise<{ code: number; stderr: string }> {
  return new Promise((resolveResult) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("error", (error) => resolveResult({ code: 1, stderr: error.message }));
    child.on("close", (code) => resolveResult({ code: code ?? 1, stderr }));
  });
}
