import { showHUD } from "@raycast/api";
import { makeVLCRequest, handleVLCError } from "./utils";

export default async function main() {
  try {
    await makeVLCRequest({ command: "pl_stop" });
    await showHUD("⏹️ Stop");
  } catch (error) {
    await handleVLCError(error, "stop");
  }
}
