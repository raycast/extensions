import { showHUD } from "@raycast/api";
import { makeVLCRequest, handleVLCError } from "./utils";

export default async function main() {
  try {
    await makeVLCRequest({ command: "pl_previous" });
    await showHUD("⏮️ Previous");
  } catch (error) {
    await handleVLCError(error, "go to previous track");
  }
}
