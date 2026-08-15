import { showHUD } from "@raycast/api";
import { makeVLCRequest, handleVLCError } from "./utils";

export default async function main() {
  try {
    await makeVLCRequest({ command: "seek", parameters: { val: "-10" } });
    await showHUD("⏪ Seek Backward");
  } catch (error) {
    await handleVLCError(error, "seek backward");
  }
}
