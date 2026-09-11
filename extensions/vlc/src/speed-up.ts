import { showHUD } from "@raycast/api";
import { makeVLCRequest, handleVLCError, getVLCStatus } from "./utils";

export default async function main() {
  try {
    const status = await getVLCStatus();
    const currentRate = status.rate || 1;
    const newRate = Math.min(currentRate + 0.25, 4.0);

    await makeVLCRequest({ command: "rate", parameters: { val: newRate } });
    await showHUD(`⚡ Speed increased to ${newRate.toFixed(2)}x`);
  } catch (error) {
    await handleVLCError(error, "increase playback speed");
  }
}
