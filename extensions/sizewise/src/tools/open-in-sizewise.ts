import { expandPath, folderName } from "../paths";
import { openInSizewise, ScanError } from "../sizewise";

type Input = {
  /**
   * The folder or disk to scan, as an absolute path or a path starting with `~` for the home
   * folder, such as `~/Downloads`, `/Applications`, or `/Volumes/Backup`.
   */
  path: string;
};

/**
 * Opens a folder or disk in the Sizewise app, which scans it and shows what takes up its space as
 * a treemap. Use it when someone wants to see what's using space in a folder or on a disk. The
 * scan's results appear in Sizewise, not here.
 */
export default async function tool(input: Input): Promise<string> {
  const path = expandPath(input.path);
  if (path === undefined) {
    throw new Error(`"${input.path}" isn't an absolute path or a path starting with ~.`);
  }
  try {
    await openInSizewise(path);
  } catch (error) {
    if (error instanceof ScanError) throw new Error(`${error.title}. ${error.message}`);
    throw error;
  }
  return `Opened ${folderName(path)} (${path}) in Sizewise, which is scanning it.`;
}
