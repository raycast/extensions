import { askSizewise } from "../saved-scans";

type Input = {
  /** The path of a saved scan, a .sizewise file, as find-saved-scans lists it. */
  scan: string;
  /**
   * A folder in the scan, as an absolute path, a path starting with `~`, or a path inside the
   * scanned folder. Leave it out for the scanned folder itself.
   */
  folder?: string;
  /** How many items to list, from 1 to 200. 25 when left out. */
  limit?: number;
};

/** Lists what's in a folder of a saved scan, largest first, with each item's size and kind. */
export default async function tool(input: Input) {
  return askSizewise("list_folder", input);
}
