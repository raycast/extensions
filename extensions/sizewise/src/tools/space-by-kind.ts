import { askSizewise } from "../saved-scans";

type Input = {
  /** The path of a saved scan, a .sizewise file, as find-saved-scans lists it. */
  scan: string;
  /**
   * A folder in the scan, as an absolute path, a path starting with `~`, or a path inside the
   * scanned folder. Leave it out for the scanned folder itself.
   */
  folder?: string;
};

/** Says how much of a folder in a saved scan each kind of file takes up, such as Video or Apps. */
export default async function tool(input: Input) {
  return askSizewise("space_by_kind", input);
}
