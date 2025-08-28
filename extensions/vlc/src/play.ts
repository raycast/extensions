import { showHUD } from "@raycast/api";
import { makeVLCRequest, handleVLCError } from "./utils";

export default async function main() {
  try {
    await makeVLCRequest({ command: "pl_play" });
    await showHUD("▶️ Play");
  } catch (error) {
    await handleVLCError(error, "play");
  }
}
