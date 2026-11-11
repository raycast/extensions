import { askSizewise } from "../saved-scans";

type Input = {
  /** The path of a saved scan, a .sizewise file, as find-saved-scans lists it. */
  scan: string;
  /**
   * A folder in the scan, as an absolute path, a path starting with `~`, or a path inside the
   * scanned folder. Leave it out for the scanned folder itself.
   */
  folder?: string;
  /** How many files to list, from 1 to 200. 20 when left out. */
  limit?: number;
};

/**
 * Lists the largest files in a folder of a saved scan, at any depth, largest first. An app or
 * another package counts as one item. Unlike find-large-files, it sees every file the scan read,
 * including ones Spotlight doesn't index.
 */
export default async function tool(input: Input) {
  return askSizewise("largest_files", input);
}
