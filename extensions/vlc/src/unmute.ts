import { showHUD } from "@raycast/api";
import { makeVLCRequest, handleVLCError } from "./utils";

export default async function main() {
  try {
    await makeVLCRequest({ command: "volume", parameters: { val: "256" } });
    await showHUD("🔊 Unmuted");
  } catch (error) {
    await handleVLCError(error, "unmute");
  }
}
