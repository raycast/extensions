import { showHUD } from "@raycast/api";
import { makeVLCRequest, handleVLCError, getVLCStatus } from "./utils";

export default async function main() {
  try {
    const status = await getVLCStatus();
    const currentRate = status.rate || 1;
    const newRate = Math.max(currentRate - 0.25, 0.25);

    await makeVLCRequest({ command: "rate", parameters: { val: newRate } });
    await showHUD(`⚡ Speed decreased to ${newRate.toFixed(2)}x`);
  } catch (error) {
    await handleVLCError(error, "decrease playback speed");
  }
}
