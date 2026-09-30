import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readdir, realpath } from "node:fs/promises";
import { Drive } from "./types";

const pexec = promisify(execFile);

export async function isVolumeIndexed(path: string): Promise<boolean> {
  try {
    const { stdout } = await pexec("mdutil", ["-s", path], { maxBuffer: 1024 * 1024 });
    return /Indexing enabled/i.test(stdout);
  } catch {
    return false;
  }
}

/**
 * Discover the root volume plus everything under /Volumes, skipping entries that
 * are just symlinks back to "/" (Finder shows "Macintosh HD" there as a symlink).
 */
export async function listDrives(): Promise<Drive[]> {
  const drives: Drive[] = [{ path: "/", name: "Macintosh HD", isRoot: true, indexed: await isVolumeIndexed("/") }];

  let entries: string[] = [];
  try {
    entries = await readdir("/Volumes");
  } catch {
    entries = [];
  }

  for (const entry of entries) {
    const p = `/Volumes/${entry}`;
    let resolved = p;
    try {
      resolved = await realpath(p);
    } catch {
      // unreadable mount (e.g. permissions) — still list it
    }
    if (resolved === "/") continue; // symlink to root, already covered
    drives.push({ path: p, name: entry, isRoot: false, indexed: await isVolumeIndexed(p) });
  }

  return drives;
}
