import { memoryOverview, readyMintCLI } from "../mint-ai";
import { runMintSurface } from "../mint-cli";
import { MemoryScan } from "../mint-panes";

/**
 * How much memory is in use and which apps hold it, in Mint's piles: Idle,
 * In use and Ask first, each app sized by what quitting it gives back. Read-only.
 */
export default async function tool() {
  const cli = readyMintCLI();
  return memoryOverview(await runMintSurface<MemoryScan>(cli, { action: "memory.scan" }, 60_000));
}
