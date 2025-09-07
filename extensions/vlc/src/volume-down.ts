import { showHUD } from "@raycast/api";
import { makeVLCRequest, handleVLCError } from "./utils";

export default async function main() {
  try {
    await makeVLCRequest({ command: "volume", parameters: { val: "-20" } });
    await showHUD("🔉 Volume Down");
  } catch (error) {
    await handleVLCError(error, "decrease volume");
  }
}
