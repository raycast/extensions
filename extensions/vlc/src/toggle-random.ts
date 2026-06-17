import { showHUD } from "@raycast/api";
import { makeVLCRequest, handleVLCError } from "./utils";

export default async function main() {
  try {
    await makeVLCRequest({ command: "pl_random" });
    await showHUD("🔀 Toggle Random");
  } catch (error) {
    await handleVLCError(error, "toggle random");
  }
}
