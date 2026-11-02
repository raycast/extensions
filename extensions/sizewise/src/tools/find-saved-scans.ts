import { askSizewise } from "../saved-scans";

/**
 * Lists the scans saved in Sizewise (File > Save Scan…), newest first, with the folder each one
 * scanned, when it ran, and the path to pass to the other saved-scan tools. A saved scan shows a
 * folder as it was when it was saved, so say when it ran.
 */
export default async function tool() {
  return askSizewise("find_saved_scans", {});
}
