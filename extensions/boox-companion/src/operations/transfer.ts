import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { BooxClient } from "../api/boox-client";
import { describeBooxError } from "../lib/errors";
import { isLibraryDocument, normalizeRemotePath, validateUploadName } from "../lib/paths";
import { ConflictPolicy, StorageEntry, TransferMode, TransferResult } from "../models/boox";

const MAX_FILE_SIZE = 32 * 1024 ** 3;
const MAX_FILE_COUNT = 500;

export async function transferFiles(options: {
  client: BooxClient;
  paths: string[];
  mode: TransferMode;
  destination?: string;
  libraryParentId?: string;
  conflictPolicy: ConflictPolicy;
  onProgress?: (completed: number, total: number, fileName: string) => void | Promise<void>;
}): Promise<TransferResult> {
  const uniquePaths = [...new Set(options.paths)];
  if (!uniquePaths.length) throw new Error("Choose at least one file");
  if (uniquePaths.length > MAX_FILE_COUNT) throw new Error("BOOXDrop accepts at most 500 files at a time");

  const files: Array<{ path: string; name: string; size: number }> = [];
  const names = new Set<string>();
  for (const filePath of uniquePaths) {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw new Error(`${path.basename(filePath)} is not a regular file`);
    if (fileStat.size > MAX_FILE_SIZE) throw new Error(`${path.basename(filePath)} exceeds the 32 GB BOOXDrop limit`);
    const name = path.basename(filePath);
    const validationError = validateUploadName(name);
    if (validationError) throw new Error(`${name}: ${validationError}`);
    if (names.has(name)) throw new Error(`Multiple selected files are named ${name}`);
    names.add(name);
    if (options.mode === "library" && !isLibraryDocument(name)) {
      throw new Error(`${name} is not accepted by the BOOX Library uploader`);
    }
    files.push({ path: filePath, name, size: fileStat.size });
  }

  const destination = normalizeRemotePath(options.destination || "/Download");
  const duplicateParent = options.mode === "library" ? "Document" : destination;
  const duplicates = new Set(
    await options.client.checkDuplicates(
      files.map((file) => file.name),
      duplicateParent
    )
  );

  const items: TransferResult["items"] = [];
  let completed = 0;
  for (const file of files) {
    if (duplicates.has(file.name) && (options.conflictPolicy === "skip" || options.mode === "library")) {
      items.push({ path: file.path, name: file.name, status: "skipped" });
      completed += 1;
      await options.onProgress?.(completed, files.length, file.name);
      continue;
    }

    try {
      if (options.mode === "library") {
        await options.client.uploadLibrary(file.path, options.libraryParentId);
      } else {
        let replaced = false;
        if (duplicates.has(file.name)) {
          const page = await options.client.listStorage(destination, 0, 10_000);
          const existing = page.list.find((entry) => entry.name === file.name);
          if (existing?.dir) throw new Error(`${file.name} is an existing folder and cannot be replaced`);
          if (existing) {
            await replaceStorageFile(options.client, file.path, file.size, destination, existing);
            replaced = true;
          }
        }
        if (!replaced) await options.client.uploadStorage(file.path, destination);
      }
      let indexed: boolean | undefined;
      if (options.mode === "library") {
        try {
          indexed = await waitForLibraryIndex(options.client, file.name);
        } catch {
          indexed = false;
        }
      }
      items.push({ path: file.path, name: file.name, status: "uploaded", indexed });
    } catch (error) {
      items.push({ path: file.path, name: file.name, status: "failed", error: describeBooxError(error) });
    }
    completed += 1;
    await options.onProgress?.(completed, files.length, file.name);
  }

  return {
    items,
    uploaded: items.filter((item) => item.status === "uploaded").length,
    skipped: items.filter((item) => item.status === "skipped").length,
    failed: items.filter((item) => item.status === "failed").length,
  };
}

async function replaceStorageFile(
  client: BooxClient,
  localPath: string,
  localSize: number,
  destination: string,
  existing: StorageEntry
): Promise<void> {
  const backupName = `BOOX-Backup-${randomUUID()}`;
  const backup = {
    ...existing,
    name: backupName,
    path: path.posix.join(path.posix.dirname(existing.path), backupName),
  };

  await client.renameStorage(existing, backupName);
  try {
    await client.uploadStorage(localPath, destination);
  } catch (uploadError) {
    let observedReplacement: StorageEntry | undefined;
    try {
      const page = await client.listStorage(destination, 0, 10_000);
      observedReplacement = page.list.find((entry) => entry.name === existing.name && entry.path !== backup.path);
    } catch (inspectionError) {
      throw new Error(
        `${describeBooxError(uploadError)}. The upload outcome could not be verified: ${describeBooxError(inspectionError)}. ` +
          `The original remains as ${backupName}; no recovery change was attempted`
      );
    }

    if (observedReplacement && !observedReplacement.dir && observedReplacement.size === localSize) {
      try {
        if (await remoteFileMatches(client, observedReplacement, localPath)) {
          await removeStorageBackup(client, backup);
          return;
        }
      } catch (verificationError) {
        throw new Error(
          `${describeBooxError(uploadError)}. The same-name file could not be verified by content: ${describeBooxError(verificationError)}. ` +
            `It was left untouched; the original remains as ${backupName}`
        );
      }
    }

    if (observedReplacement) {
      throw new Error(
        `${describeBooxError(uploadError)}. A same-name file may have completed uploading and was left untouched; the original remains as ${backupName}`
      );
    }

    try {
      await client.renameStorage(backup, existing.name);
    } catch (restoreError) {
      throw new Error(
        `${describeBooxError(uploadError)}. The original remains as ${backupName}, but automatic restoration failed: ${describeBooxError(restoreError)}`
      );
    }
    throw uploadError;
  }

  await removeStorageBackup(client, backup);
}

async function remoteFileMatches(client: BooxClient, remote: StorageEntry, localPath: string): Promise<boolean> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "boox-transfer-verify-"));
  try {
    const downloaded = await client.downloadFile(remote.path, path.join(directory, "replacement"));
    const [localHash, remoteHash] = await Promise.all([hashFile(localPath), hashFile(downloaded)]);
    return localHash === remoteHash;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function hashFile(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

async function removeStorageBackup(client: BooxClient, backup: StorageEntry): Promise<void> {
  try {
    await client.deleteStorage(backup);
  } catch (cleanupError) {
    throw new Error(
      `Replacement uploaded, but the preserved backup ${backup.name} could not be removed: ${describeBooxError(cleanupError)}`
    );
  }
}

async function waitForLibraryIndex(client: BooxClient, fileName: string): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 750));
    const library = await client.getLibrary({ query: fileName, limit: 50 });
    if (library.books.some((book) => book.name === fileName || path.basename(book.path) === fileName)) return true;
  }
  return false;
}
