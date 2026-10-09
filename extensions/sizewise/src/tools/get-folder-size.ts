import { formatBytes } from "../format";
import { measureFolder } from "../folder-size";
import { expandPath, folderName, folderStatus } from "../paths";

type Input = {
  /**
   * The folder or disk to measure, as an absolute path or a path starting with `~` for the home
   * folder, such as `~/Downloads`, `/Applications`, or `/Volumes/Backup`.
   */
  path: string;
};

/**
 * Measures how much space a folder or disk takes up, counting the space its files take on disk.
 * `unreadableFolderCount` is how many folders inside couldn't be read and aren't counted, so when
 * it's more than 0 the folder takes up at least `size`. It doesn't say what's inside: for that,
 * open the folder in Sizewise.
 */
export default async function tool(input: Input) {
  const path = expandPath(input.path);
  if (path === undefined) {
    throw new Error(`"${input.path}" isn't an absolute path or a path starting with ~.`);
  }
  const name = folderName(path);
  switch (await folderStatus(path)) {
    case "missing":
      throw new Error(`There's no folder at ${path}.`);
    case "notFolder":
      throw new Error(`${path} is a file, not a folder.`);
    case "unreadable":
      throw new Error(`Raycast doesn't have permission to read ${name}. Open it in Sizewise instead.`);
    case "folder":
      break;
  }
  const { bytes, unreadableFolderCount } = await measureFolder(path);
  return { name, path, size: formatBytes(bytes), unreadableFolderCount };
}
