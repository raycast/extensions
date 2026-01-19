import { showHUD } from "@raycast/api";
import { makeVLCRequest, handleVLCError } from "./utils";

export default async function main() {
  try {
    await makeVLCRequest({ command: "rate", parameters: { val: 1.0 } });
    await showHUD("⚡ Speed reset to normal (1.0x)");
  } catch (error) {
    await handleVLCError(error, "reset playback speed");
  }
}
