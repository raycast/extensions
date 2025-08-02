import { showHUD } from "@raycast/api";
import { makeVLCRequest, handleVLCError } from "./utils";

export default async function main() {
  try {
    await makeVLCRequest({ command: "volume", parameters: { val: "+20" } });
    await showHUD("🔊 Volume Up");
  } catch (error) {
    await handleVLCError(error, "increase volume");
  }
}
