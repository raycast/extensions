import { constants, promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { Store } from "./store";
import { id, type Move } from "./model";

export async function fileHash(file: string) {
  // Validate the opened file, not an earlier pathname lookup. O_NONBLOCK also
  // avoids waiting on a FIFO substituted for the selected file.
  const handle = await fs
    .open(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ELOOP")
        throw new Error("Only regular files can be filed. Folders and symbolic links are not supported.");
      throw error;
    });
  try {
    if (!(await handle.stat()).isFile())
      throw new Error("Only regular files can be filed. Folders and symbolic links are not supported.");
    const hash = createHash("sha256");
    for await (const chunk of handle.createReadStream({ autoClose: false })) hash.update(chunk);
    return hash.digest("hex");
  } finally {
    await handle.close();
  }
}
async function exists(file: string) {
  try {
    await fs.lstat(file);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}
type FolderIdentity = { path: string; dev: number; ino: number };
class RecoveryRequiredError extends Error {}

async function checkedFolder(folder: string): Promise<FolderIdentity> {
  if (!path.isAbsolute(folder)) throw new Error("Choose an absolute folder path.");
  const real = await fs.realpath(folder);
  const info = await fs.stat(real);
  if (!info.isDirectory()) throw new Error("The destination is not a folder.");
  const identity = { path: real, dev: info.dev, ino: info.ino };
  await assertFolderUnchanged(identity);
  await fs.access(real, constants.W_OK);
  return identity;
}
async function assertFolderUnchanged(folder: FolderIdentity) {
  try {
    const [real, info] = await Promise.all([fs.realpath(folder.path), fs.lstat(folder.path)]);
    if (real === folder.path && info.isDirectory() && info.dev === folder.dev && info.ino === folder.ino) return;
  } catch (error) {
    throw new Error("A filing folder changed or is no longer available. Review the folders before retrying.", {
      cause: error,
    });
  }
  throw new Error("A filing folder changed. Review the folders before retrying.");
}
export async function validateFolder(folder: string): Promise<string> {
  return (await checkedFolder(folder)).path;
}
async function transfer(
  store: Store,
  moveId: string,
  source: string,
  destination: string,
  expected: string,
  destinationFolder: FolderIdentity,
) {
  // Keep the destination identity captured before the pending journal write.
  // Re-resolving it here would silently approve a replacement folder.
  await assertFolderUnchanged(destinationFolder);
  const sourceFolder = await checkedFolder(path.dirname(source));
  if (sourceFolder.path !== path.dirname(source))
    throw new Error("The source folder changed. Review the folders before retrying.");
  if ((await fileHash(source)) !== expected) throw new Error("The file changed. Refresh and review it again.");
  const sourceInfo = await fs.lstat(source);
  if (sourceInfo.dev !== destinationFolder.dev)
    throw new Error(
      "Choose a folder on the same volume. Jev cannot safely move files between volumes; use Finder for that move.",
    );
  if (await exists(destination))
    throw Object.assign(new Error("A file already exists at the destination. Nothing was overwritten."), {
      code: "EEXIST",
    });

  // Claim the source with one rename before publishing it. The private path is
  // journaled first so an interrupted move is visible in Filing History.
  await assertFolderUnchanged(sourceFolder);
  const stagingDirectory = await fs.mkdtemp(path.join(path.dirname(source), ".jev-move-"));
  const staged = path.join(stagingDirectory, path.basename(source));
  let stagingFolder: FolderIdentity | undefined;
  let claimed = false;
  let published = false;
  try {
    stagingFolder = await checkedFolder(stagingDirectory);
    await assertFolderUnchanged(sourceFolder);
    await store.update((data) => {
      const move = data.moves.find((m) => m.id === moveId);
      if (!move) throw new Error("Move not found.");
      move.recoveryPath = staged;
      move.status = "pending";
    });
    await assertFolderUnchanged(sourceFolder);
    await assertFolderUnchanged(stagingFolder);
    await fs.rename(source, staged);
    claimed = true;
    if ((await fileHash(staged)) !== expected)
      throw new Error("The file changed during the move. Refresh and review it again.");

    // Hard links publish without overwriting and retain the same inode. Writes
    // through an already-open file handle therefore reach the destination too.
    // Never fall back to copy/unlink, even if the volume changed after preflight.
    await assertFolderUnchanged(stagingFolder);
    await assertFolderUnchanged(destinationFolder);
    await fs.link(staged, destination);
    published = true;
    // A swap during publication must retain the recovery name. Never clean up
    // a destination through a path whose parent identity has changed.
    await assertFolderUnchanged(stagingFolder);
    await assertFolderUnchanged(destinationFolder);
    await fs.unlink(staged);
  } catch (error) {
    if (claimed) {
      if (!published) {
        try {
          // Restore without replacing a file recreated at the original path.
          await assertFolderUnchanged(sourceFolder);
          await assertFolderUnchanged(stagingFolder!);
          await fs.link(staged, source);
          await assertFolderUnchanged(sourceFolder);
          await assertFolderUnchanged(stagingFolder!);
          await fs.unlink(staged);
        } catch {
          throw new RecoveryRequiredError(
            `The move stopped and recovery data was retained. Its last known location is ${staged}. If its containing folder moved, check that folder's new location. Open Filing History for details.`,
            { cause: error },
          );
        }
      } else {
        throw new RecoveryRequiredError(
          `The move could not be verified, or cleanup stopped. Recovery data was retained at its last known location ${staged}. If its containing folder moved, check that folder's new location. Open Filing History for details.`,
          { cause: error },
        );
      }
    }
    if ((error as NodeJS.ErrnoException).code === "EXDEV")
      throw new Error(
        "Choose a folder on the same volume. The original file was restored; use Finder to move it between volumes.",
      );
    throw error;
  } finally {
    // Only remove an empty staging directory. Never recursively delete recovery data.
    if (stagingFolder) {
      await assertFolderUnchanged(stagingFolder)
        .then(() => fs.rmdir(stagingDirectory))
        .catch(() => {});
    }
  }
}
async function recordFailure(store: Store, moveId: string, error: unknown, fallbackStatus: "failed" | "moved") {
  await store.update(async (data) => {
    const move = data.moves.find((m) => m.id === moveId);
    if (!move) return;
    if (!(error instanceof RecoveryRequiredError) && move.recoveryPath && !(await exists(move.recoveryPath)))
      delete move.recoveryPath;
    move.status = move.recoveryPath ? "failed" : fallbackStatus;
    move.error =
      (error as NodeJS.ErrnoException).code === "EEXIST"
        ? "Destination already exists. Neither existing file was overwritten."
        : String((error as Error).message);
  });
}
async function moveDocumentUnlocked(store: Store, source: string, folder: string): Promise<Move> {
  const directory = await checkedFolder(folder);
  const canonicalSource = path.join(await fs.realpath(path.dirname(source)), path.basename(source));
  const destination = path.join(directory.path, path.basename(source));
  if (canonicalSource === destination) throw new Error("The file is already in that folder.");
  const record: Move = {
    id: id(),
    source: canonicalSource,
    destination,
    sha256: await fileHash(canonicalSource),
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  await store.update((d) => {
    d.moves.unshift(record);
  });
  try {
    await transfer(store, record.id, canonicalSource, destination, record.sha256, directory);
  } catch (error) {
    await recordFailure(store, record.id, error, "failed");
    throw error;
  }
  await store.update((d) => {
    const m = d.moves.find((m) => m.id === record.id);
    if (m) {
      m.status = "moved";
      delete m.recoveryPath;
    }
  });
  return { ...record, status: "moved" };
}
async function undoMoveUnlocked(store: Store, moveId: string) {
  const m = (await store.read()).moves.find((m) => m.id === moveId);
  if (!m || m.status !== "moved") throw new Error("This move cannot be undone.");
  const directory = await checkedFolder(path.dirname(m.source));
  if (directory.path !== path.dirname(m.source))
    throw new Error("The original folder changed. Review the folders before undoing this move.");
  try {
    await transfer(store, m.id, m.destination, m.source, m.sha256, directory);
  } catch (error) {
    await recordFailure(store, m.id, error, "moved");
    throw error;
  }
  await store.update((d) => {
    const found = d.moves.find((x) => x.id === m.id);
    if (found) {
      found.status = "undone";
      delete found.recoveryPath;
      delete found.error;
    }
  });
}
async function recoverMoveUnlocked(store: Store, moveId: string) {
  const m = (await store.read()).moves.find((x) => x.id === moveId);
  if (!m) throw new Error("Move not found.");
  if (m.recoveryPath && (await exists(m.recoveryPath)))
    throw new Error(
      "A recovery file remains. Choose Show Recovery File and inspect it with the original and destination. Reconciliation has not changed any files.",
    );
  const hashOrMissing = async (p: string) => {
    try {
      return await fileHash(p);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  };
  const [source, destination] = await Promise.all([hashOrMissing(m.source), hashOrMissing(m.destination)]);
  const status =
    source === null && destination === m.sha256
      ? "moved"
      : source === m.sha256 && destination === null
        ? "undone"
        : null;
  if (!status)
    throw new Error("Both paths exist or a file changed. Inspect both files manually; recovery has not changed them.");
  await store.update((d) => {
    const found = d.moves.find((x) => x.id === m.id);
    if (found) {
      found.status = status;
      delete found.error;
      delete found.recoveryPath;
    }
  });
}

export async function moveDocument(store: Store, source: string, folder: string) {
  return store.withFileOperations(() => moveDocumentUnlocked(store, source, folder));
}
export async function undoMove(store: Store, moveId: string) {
  return store.withFileOperations(() => undoMoveUnlocked(store, moveId));
}
export async function recoverMove(store: Store, moveId: string) {
  return store.withFileOperations(() => recoverMoveUnlocked(store, moveId));
}
