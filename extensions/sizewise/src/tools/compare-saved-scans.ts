import { askSizewise } from "../saved-scans";

type Input = {
  /** The path of the earlier saved scan, as find-saved-scans lists it. */
  older: string;
  /** The path of the later saved scan, as find-saved-scans lists it. */
  newer: string;
  /**
   * A folder in the scans, as an absolute path or a path starting with `~`. Leave it out for the
   * whole scanned folder.
   */
  folder?: string;
  /** How many changed files to list, from 1 to 200. 20 when left out. */
  limit?: number;
};

/**
 * Says what changed between two saved scans of the same folder: how much it grew or shrank, how
 * many files are new, grew, shrank, or were removed, and the files that changed the most.
 */
export default async function tool(input: Input) {
  return askSizewise("compare_scans", input);
}
