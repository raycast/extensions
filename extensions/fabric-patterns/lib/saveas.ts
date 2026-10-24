// Save as… on the Result view: any folder the user picks, through the same guard and
// no-overwrite writer as every other save, refusing the same folders (paths.refusedFolders).
// The view never touches the clipboard.

import { extname } from "node:path";
import { isPlainFileName, PathError, writeNewFile } from "./paths";

/**
 * The file name Save as writes: a bare name gets `.md`, `.md` and `.txt` are kept, anything else
 * (another extension, a slash, a leading dot) is refused. Checked before any folder is touched,
 * so a refusal here is always the name's.
 */
export function saveAsName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new PathError("Name is required");
  const ext = extname(trimmed).toLowerCase();
  const name = ext ? trimmed : `${trimmed}.md`;
  if (ext && ext !== ".md" && ext !== ".txt") throw new PathError(`The name must end in .md or .txt: ${trimmed}`);
  if (!isPlainFileName(name)) throw new PathError(`Letters, digits, spaces and _ . - only: ${trimmed}`);
  return name;
}

/** Writes `text` as a new file in `folder` and returns its path; a taken name becomes `name-2.md`. */
export function saveAs(
  folder: string,
  name: string,
  text: string,
  o: { patternsRoot: string; refused: readonly string[] },
): string {
  return writeNewFile(folder, saveAsName(name), text, o.patternsRoot, o.refused);
}
