import { showHUD } from "@raycast/api";
import { makeVLCRequest, handleVLCError } from "./utils";

export default async function main() {
  try {
    await makeVLCRequest({ command: "pl_pause" });
    await showHUD("⏸️ Pause");
  } catch (error) {
    await handleVLCError(error, "pause");
  }
}
