import { showHUD } from "@raycast/api";
import { makeVLCRequest, handleVLCError } from "./utils";

export default async function main() {
  try {
    await makeVLCRequest({ command: "pl_next" });
    await showHUD("⏭️ Next");
  } catch (error) {
    await handleVLCError(error, "go to next track");
  }
}
