import { showHUD } from "@raycast/api";
import { makeVLCRequest, handleVLCError } from "./utils";

export default async function main() {
  try {
    await makeVLCRequest({ command: "pl_loop" });
    await showHUD("🔁 Toggle Loop");
  } catch (error) {
    await handleVLCError(error, "toggle loop");
  }
}
