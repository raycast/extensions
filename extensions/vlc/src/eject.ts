import { showHUD } from "@raycast/api";
import { makeVLCRequest, handleVLCError } from "./utils";

export default async function main() {
  try {
    await makeVLCRequest({ command: "eject" });
    await showHUD("⏏️ Eject");
  } catch (error) {
    await handleVLCError(error, "eject");
  }
}
