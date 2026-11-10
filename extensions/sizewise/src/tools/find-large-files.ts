import { homedir } from "node:os";
import { formatBytes } from "../format";
import { largeFiles, minimumSizes, spotlightFiles } from "../large-files";
import { expandPath } from "../paths";

type Input = {
  /**
   * The folder to search, as an absolute path or a path starting with `~`, such as `~/Downloads`.
   * Leave it out to search the whole home folder.
   */
  folder?: string;
  /**
   * The smallest file size to list, in megabytes, such as 1000 for files of 1 GB or more. Leave it
   * out unless someone names a size. Sizes below 100 count as 100.
   */
  minimumMegabytes?: number;
};

/**
 * Lists the largest files in a folder, or in the home folder, largest first, at most 20, with each
 * file's path and the space it takes on disk. It finds them with Spotlight, so it's fast, but it
 * misses files Spotlight doesn't index, such as most of ~/Library and disks Spotlight skips.
 */
export default async function tool(input: Input) {
  const folder = input.folder === undefined ? homedir() : expandPath(input.folder);
  if (folder === undefined) {
    throw new Error(`"${input.folder}" isn't an absolute path or a path starting with ~.`);
  }
  const minimumBytes = Math.max(minimumSizes[0], Math.round((input.minimumMegabytes ?? 0) * 1_000_000));
  const files = await largeFiles(await spotlightFiles(folder, minimumBytes), minimumBytes);
  return files.slice(0, 20).map((file) => ({ name: file.name, path: file.path, size: formatBytes(file.bytes) }));
}
