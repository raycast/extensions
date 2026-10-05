import fs from "node:fs";

/**
 * Rename a file, falling back to copy+verify+unlink across volumes.
 * `rename`/`unlinkSource` are injectable so tests can drive the EXDEV path
 * without a second real volume.
 */
export function moveFile(from, to, rename = fs.renameSync, unlinkSource = fs.unlinkSync) {
  try {
    rename(from, to);
  } catch (err) {
    if (err.code !== "EXDEV") throw err;
    fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL);
    const [source, destination] = [fs.statSync(from), fs.statSync(to)];
    if (source.size !== destination.size) {
      fs.unlinkSync(to);
      // code + path let adapters render this in their own language.
      const e = new Error(`Cross-volume copy verification failed: ${from}`);
      e.code = "EXDEV_VERIFY";
      e.path = from;
      throw e;
    }
    try {
      // A copy gets a fresh mtime where a rename keeps it. Restore the source's
      // timestamps so both paths have the same semantics — the perceptual-hash
      // cache keys entries on size+mtime, and a changed mtime would force every
      // image moved across volumes to be re-decoded on the next run.
      fs.utimesSync(to, source.atime, source.mtime);
    } catch {
      // Timestamps are metadata; failing to restore them must not fail a move
      // whose bytes are already verified in place.
    }
    try {
      unlinkSource(from);
    } catch (unlinkError) {
      // Removing the copy keeps the move all-or-nothing: leaving both sides
      // behind would look like a success and silently duplicate the file.
      try {
        fs.unlinkSync(to);
      } catch {
        // Preserve the source-removal error; the destination cleanup is best effort.
      }
      throw unlinkError;
    }
  }
}
