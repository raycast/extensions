import { diskOverview, readStatus, readyMintCLI } from "../mint-ai";
import { savedGroups } from "../mint-saved";

/**
 * How full the Mac's disk is and what Mint found on it at its last Scan, in
 * Mint's four groups: Optimizable, Safe to clean, Yours and Keep. Read-only.
 */
export default async function tool() {
  const cli = readyMintCLI();
  return diskOverview(await readStatus(cli), savedGroups());
}
