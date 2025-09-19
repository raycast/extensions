import { showHUD } from "@raycast/api";
import { makeVLCRequest, handleVLCError } from "./utils";

export default async function main() {
  try {
    await makeVLCRequest({ command: "fullscreen" });
    await showHUD("🖥️ Toggle Fullscreen");
  } catch (error) {
    await handleVLCError(error, "toggle fullscreen");
  }
}
