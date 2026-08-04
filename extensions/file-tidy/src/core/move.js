import fs from "node:fs";

/** Rename a file, falling back to copy+verify+unlink across volumes. */
export function moveFile(from, to, rename = fs.renameSync, unlinkSource = fs.unlinkSync) {
  try {
    rename(from, to);
  } catch (err) {
    if (err.code !== "EXDEV") throw err;
    fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL);
    const [source, destination] = [fs.statSync(from), fs.statSync(to)];
    if (source.size !== destination.size) {
      fs.unlinkSync(to);
      const error = new Error(`Cross-volume copy verification failed: ${from}`);
      error.code = "EXDEV_VERIFY";
      error.path = from;
      throw error;
    }
    try {
      unlinkSource(from);
    } catch (unlinkError) {
      try {
        fs.unlinkSync(to);
      } catch {
        // Preserve the source-removal error; the destination cleanup is best effort.
      }
      throw unlinkError;
    }
  }
}
