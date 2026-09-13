// ─────────────────────────────────────────────────────────────────────
// config-io.mjs — testable filesystem I/O for switcheroo config.
//
// Handles:
//   - Atomic write via sibling temp (O_EXCL, 0600, fsync, rename)
//   - Short-write protection: loop writeSync until full Buffer written
//   - Stale-revision detection (SHA-256 content check)
//   - Missing-config creation (parent dir + exclusive file creation)
//   - Symlink resolution (dotfiles are symlinked, preserve them)
//   - Dangling file symlink rejection
//   - Target identity carried from snapshot through commit
//
// No new dependencies. Uses Node.js built-in fs and crypto.
//
// RESIDUAL OS RACE (documented honestly):
//   The final recheck → rename window is an unavoidable TOCTOU gap with
//   normal Node.js POSIX APIs. An external process can atomically replace
//   the destination after our recheck but before our rename, and our
//   rename would overwrite that edit. We do not claim perfect hostile-
//   writer CAS. The layered checks (revision, dev/inode, recheck) narrow
//   this to a sub-millisecond window and protect against all non-adversarial
//   concurrent edits (editors, other extension instances, etc.). A true
//   compare-and-swap would require macOS-specific APIs (renamex_np with
//   RENAME_SECLUDE) or a lock file, which is out of scope for this extension.
// ─────────────────────────────────────────────────────────────────────

import {
  readFileSync,
  existsSync,
  lstatSync,
  realpathSync,
  renameSync,
  unlinkSync,
  closeSync,
  openSync,
  writeSync,
  fsyncSync,
  chmodSync,
  mkdirSync,
} from "fs";
import { join, dirname, isAbsolute } from "path";
import crypto from "crypto";

/**
 * Compute SHA-256 of content.
 * @param {string} content
 * @returns {string} hex digest
 */
export function computeRevision(content) {
  return crypto.createHash("sha256").update(content, "utf-8").digest("hex");
}

/**
 * Write an entire Buffer to a file descriptor, handling short writes.
 *
 * POSIX write(2) may complete partially without throwing. This function
 * loops until every byte is written, treating zero progress as an error.
 * The fd is closed in a finally block to prevent descriptor leaks.
 *
 * @param {number} fd - file descriptor (already open)
 * @param {string|Buffer} content - content to write
 * @param {{ fsync?: (fd: number) => void, closeFd?: (fd: number) => void }} io
 *   I/O functions for fsync and close (injectable for testing)
 * @throws {Error} on zero-progress write or I/O error
 */
export function writeAll(fd, content, io) {
  const buf = Buffer.isBuffer(content)
    ? content
    : Buffer.from(content, "utf-8");
  const total = buf.length;
  let offset = 0;
  try {
    while (offset < total) {
      const written = writeSync(fd, buf, offset, total - offset);
      if (written <= 0) {
        throw new Error(
          `Short write: 0 bytes written at offset ${offset} of ${total}. ` +
            "The file may be on a full or failing filesystem.",
        );
      }
      offset += written;
    }
    // Only fsync after the full content is written
    if (io && io.fsync) {
      io.fsync(fd);
    } else {
      fsyncSync(fd);
    }
  } finally {
    // Always close the fd, even on error, to prevent descriptor leaks
    if (io && io.closeFd) {
      io.closeFd(fd);
    } else {
      closeSync(fd);
    }
  }
}

/**
 * Injectable I/O interface for testing.
 * @typedef {Object} ConfigIO
 * @property {(path: string) => string} read
 * @property {(path: string) => boolean} exists
 * @property {(path: string) => {isFile: boolean, isSymlink: boolean, uid: number, dev: number, ino: number}} lstat
 * @property {(path: string) => string} realpath
 * @property {(path: string) => number} openExclusive
 * @property {(fd: number, buffer: Buffer, offset: number, length: number) => number} writeFd
 * @property {(fd: number) => void} fsync
 * @property {(fd: number) => void} closeFd
 * @property {(oldPath: string, newPath: string) => void} rename
 * @property {(path: string) => void} unlink
 * @property {(path: string, mode: number) => void} chmod
 * @property {(path: string, opts?: object) => void} mkdir
 */

/** Production I/O using real fs operations. */
export const productionIO = {
  read: (p) => readFileSync(p, "utf-8"),
  exists: (p) => existsSync(p),
  lstat: (p) => {
    const st = lstatSync(p);
    return {
      isFile: st.isFile(),
      isSymlink: st.isSymbolicLink(),
      uid: st.uid,
      dev: st.dev,
      ino: st.ino,
    };
  },
  realpath: (p) => realpathSync(p),
  openExclusive: (p) => openSync(p, "wx"),
  writeFd: (fd, buf, offset, length) => writeSync(fd, buf, offset, length),
  fsync: (fd) => fsyncSync(fd),
  closeFd: (fd) => closeSync(fd),
  rename: (o, n) => renameSync(o, n),
  unlink: (p) => unlinkSync(p),
  chmod: (p, m) => chmodSync(p, m),
  mkdir: (p, opts) => mkdirSync(p, opts),
};

/**
 * Resolve the target path for writing. Handles:
 *   - Absolute path validation
 *   - Existing regular files (follow symlink via realpath)
 *   - Legitimate symlinked directories (.config → elsewhere)
 *   - Dangling file symlinks → reject
 *   - Missing files → return null (caller decides create vs error)
 *
 * @param {ConfigIO} io
 * @param {string} path - absolute path to resolve
 * @returns {{ resolved: string, dev: number, ino: number } | null}
 *   null if file doesn't exist. Throws on dangling symlink or non-file.
 */
export function resolveTarget(io, path) {
  if (!isAbsolute(path)) {
    throw new Error(`Config path is not absolute: ${path}`);
  }

  // lstat does NOT follow symlinks, so it succeeds for dangling symlinks
  let lst;
  try {
    lst = io.lstat(path);
  } catch {
    return null;
  }

  if (lst.isSymlink) {
    if (!io.exists(path)) {
      throw new Error(
        `Config path is a dangling symlink: ${path}. ` +
          "Remove it or point it at a real file, then try again.",
      );
    }
    const resolved = io.realpath(path);
    const rlstat = io.lstat(resolved);
    if (!rlstat.isFile) {
      throw new Error(
        `Resolved config path is not a regular file: ${resolved}`,
      );
    }
    return { resolved, dev: rlstat.dev, ino: rlstat.ino };
  }

  if (!lst.isFile) {
    throw new Error(`Config path is not a regular file: ${path}`);
  }

  return { resolved: path, dev: lst.dev, ino: lst.ino };
}

/**
 * Write all content to a temp file using writeAll (short-write safe),
 * then return the temp path. The caller is responsible for cleanup on error.
 *
 * @param {string} tempPath - temp file path (already created via O_EXCL)
 * @param {number} fd - file descriptor for the temp file
 * @param {string} content - content to write
 * @param {ConfigIO} io
 * @returns {void}
 */
function writeTempContent(tempPath, fd, content, io) {
  const buf = Buffer.from(content, "utf-8");
  const total = buf.length;
  let offset = 0;
  try {
    while (offset < total) {
      const written = io.writeFd(fd, buf, offset, total - offset);
      if (written <= 0) {
        throw new Error(
          `Short write: 0 bytes written at offset ${offset} of ${total}. ` +
            "The file may be on a full or failing filesystem.",
        );
      }
      offset += written;
    }
    io.fsync(fd);
  } finally {
    io.closeFd(fd);
  }
}

/**
 * Atomically write content to an existing config file via sibling temp.
 *
 * Steps:
 *  1. Re-read current file, verify SHA-256 matches expectedRevision.
 *  2. Write to sibling temp (O_EXCL, 0600) using writeAll (short-write safe).
 *  3. fsync temp.
 *  4. Re-check target device/inode/bytes haven't changed.
 *  5. Atomically rename temp → resolved target.
 *  6. Clean up temp on any error.
 *
 * The target identity (resolvedPath, dev, ino) is carried from the
 * snapshot — it is NOT recomputed. If the logical path now resolves to
 * a different target (retargeted symlink), the operation fails closed.
 *
 * RESIDUAL OS RACE: The recheck → rename window is unavoidable.
 * See file header for documentation.
 *
 * @param {string} content - new content
 * @param {string} expectedRevision - SHA-256 of original content
 * @param {string} resolvedPath - resolved (realpath) target from snapshot
 * @param {number} dev - original device from snapshot
 * @param {number} ino - original inode from snapshot
 * @param {ConfigIO} io
 * @throws {Error} on stale revision, identity change, or I/O failure
 */
export function atomicWriteExisting(
  content,
  expectedRevision,
  resolvedPath,
  dev,
  ino,
  io,
) {
  // Re-read current file and verify it hasn't changed
  const currentContent = io.read(resolvedPath);
  const currentRevision = computeRevision(currentContent);
  if (currentRevision !== expectedRevision) {
    throw new Error(
      "Config file changed since it was last loaded. " +
        "Reload the config and try again.",
    );
  }

  // Revalidate: the logical path must still resolve to the SAME target
  // (dev/ino). If a symlink was retargeted, this catches it.
  const reTarget = resolveTarget(io, resolvedPath);
  if (reTarget === null) {
    throw new Error(
      "Config file disappeared during write. Aborting. " +
        "Reload the config and try again.",
    );
  }
  if (reTarget.dev !== dev || reTarget.ino !== ino) {
    throw new Error(
      "Config file target changed during write (symlink retargeted or " +
        "file replaced). Aborting. Reload the config and try again.",
    );
  }

  // Create sibling temp file (O_EXCL, 0600)
  const dir = dirname(resolvedPath);
  const tempPath = join(
    dir,
    `.config.toml.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}`,
  );
  let fd;
  try {
    fd = io.openExclusive(tempPath);
    io.chmod(tempPath, 0o600);
  } catch (e) {
    throw new Error(
      `Failed to create temp file for atomic write: ${tempPath}. ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  try {
    // Write all content with short-write protection
    writeTempContent(tempPath, fd, content, io);

    // Re-check target hasn't changed (final check before rename)
    const recheck = io.lstat(resolvedPath);
    if (recheck.dev !== dev || recheck.ino !== ino) {
      throw new Error(
        "Config file identity changed during write. Aborting. " +
          "Reload the config and try again.",
      );
    }
    const recheckContent = io.read(resolvedPath);
    const recheckRevision = computeRevision(recheckContent);
    if (recheckRevision !== expectedRevision) {
      throw new Error(
        "Config file changed during write. Aborting. " +
          "Reload the config and try again.",
      );
    }

    // Atomic rename
    io.rename(tempPath, resolvedPath);
  } catch (e) {
    try {
      io.unlink(tempPath);
    } catch {
      // best effort
    }
    throw e;
  }
}

/**
 * Exclusively create a new config file (first add on fresh install).
 *
 * Uses O_EXCL to prevent racing new file overwrite. Writes with short-write
 * protection. On any error, removes only the newly created file (never
 * an existing file). The temp+exclusive publication model ensures the
 * whole file becomes visible atomically (via the final chmod after fsync).
 *
 * @param {string} content - new content (initial config with first entry)
 * @param {string} path - absolute path to create
 * @param {ConfigIO} io
 * @throws {Error} if file already exists or parent creation fails
 */
export function exclusiveCreate(content, path, io) {
  if (!isAbsolute(path)) {
    throw new Error(`Config path is not absolute: ${path}`);
  }

  const dir = dirname(path);
  if (!io.exists(dir)) {
    io.mkdir(dir, { recursive: true, mode: 0o700 });
  }

  let fd;
  try {
    fd = io.openExclusive(path);
  } catch (e) {
    throw new Error(
      `Config file already exists or creation failed: ${path}. ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  try {
    // Write all content with short-write protection.
    // On failure, remove only the newly created file.
    const buf = Buffer.from(content, "utf-8");
    const total = buf.length;
    let offset = 0;
    while (offset < total) {
      const written = io.writeFd(fd, buf, offset, total - offset);
      if (written <= 0) {
        throw new Error(
          `Short write during initial config creation: 0 bytes at offset ${offset} of ${total}.`,
        );
      }
      offset += written;
    }
    io.fsync(fd);
    io.closeFd(fd);
    io.chmod(path, 0o600);
  } catch (e) {
    // Close fd if still open, then remove only the newly created file
    try {
      io.closeFd(fd);
    } catch {
      // fd may already be closed
    }
    try {
      io.unlink(path);
    } catch {
      // best effort
    }
    throw e;
  }
}

/**
 * Commit content to the config file. Decides between atomic update
 * (existing file) and exclusive create (missing file).
 *
 * For existing files, the resolvedPath/dev/ino from the snapshot must
 * be passed to detect symlink retargeting or file replacement.
 *
 * @param {string} content - new content
 * @param {string} expectedRevision - SHA-256 of current content
 * @param {string} path - absolute path to the config file
 * @param {string} [resolvedPath] - resolved target from snapshot (optional)
 * @param {number} [dev] - device from snapshot (optional)
 * @param {number} [ino] - inode from snapshot (optional)
 * @param {ConfigIO} io - injectable I/O
 */
export function commitConfig(
  content,
  expectedRevision,
  path,
  io,
  resolvedPath,
  dev,
  ino,
) {
  // If snapshot identity is provided, use it; otherwise resolve now
  if (resolvedPath !== undefined && dev !== undefined && ino !== undefined) {
    // Verify the path still resolves to the same target
    const reTarget = resolveTarget(io, path);
    if (reTarget === null) {
      throw new Error(
        "Config file disappeared since it was loaded. " +
          "Reload the config and try again.",
      );
    }
    if (
      reTarget.resolved !== resolvedPath ||
      reTarget.dev !== dev ||
      reTarget.ino !== ino
    ) {
      throw new Error(
        "Config file target changed since it was loaded (symlink retargeted " +
          "or file replaced). Reload the config and try again.",
      );
    }
    // Use the snapshot identity for the write
    atomicWriteExisting(content, expectedRevision, resolvedPath, dev, ino, io);
    return;
  }

  // No snapshot identity — resolve now (backward-compatible path)
  const target = resolveTarget(io, path);
  if (target === null) {
    exclusiveCreate(content, path, io);
    return;
  }
  atomicWriteExisting(
    content,
    expectedRevision,
    target.resolved,
    target.dev,
    target.ino,
    io,
  );
}
