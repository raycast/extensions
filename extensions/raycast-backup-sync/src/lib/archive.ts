import AdmZip from "adm-zip";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { toEntryPath, fromEntryPath } from "./paths";
import { BackupFileEntry } from "./types";

/**
 * Build a zip from a set of absolute file paths. Each file is stored under its
 * path relative to ~/Library so a restore can map it straight back. We read the
 * SQLite databases together with their -wal/-shm companions so the snapshot stays
 * internally consistent (see the WAL note in the spec).
 */
export function buildArchive(absPaths: string[]): {
  buffer: Buffer;
  entries: BackupFileEntry[];
} {
  const zip = new AdmZip();
  const entries: BackupFileEntry[] = [];

  for (const absPath of absPaths) {
    const data = fs.readFileSync(absPath);
    // entryPath (relative to ~/Library) encodes the directory, so the file lands
    // at the right place inside the zip and maps straight back on restore.
    const entryPath = toEntryPath(absPath);
    zip.addFile(entryPath, data);
    entries.push({ entryPath, bytes: data.length });
  }

  return { buffer: zip.toBuffer(), entries };
}

export function sha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/** Entry paths contained in an archive buffer. */
export function listArchiveEntries(buffer: Buffer): string[] {
  return new AdmZip(buffer)
    .getEntries()
    .filter((e) => !e.isDirectory)
    .map((e) => e.entryName);
}

/**
 * Extract an archive over the live ~/Library tree, overwriting existing files.
 * Returns the absolute destination paths written.
 */
export function extractArchive(buffer: Buffer): string[] {
  const zip = new AdmZip(buffer);
  const written: string[] = [];

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const dest = fromEntryPath(entry.entryName);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, entry.getData());
    written.push(dest);
  }
  return written;
}
