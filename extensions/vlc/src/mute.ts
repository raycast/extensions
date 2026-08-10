import { showHUD } from "@raycast/api";
import { makeVLCRequest, handleVLCError } from "./utils";

export default async function main() {
  try {
    await makeVLCRequest({ command: "volume", parameters: { val: "0" } });
    await showHUD("🔇 Mute");
  } catch (error) {
    await handleVLCError(error, "mute");
  }
}
