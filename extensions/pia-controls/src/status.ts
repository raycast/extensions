import { showHUD } from "@raycast/api";
import { isPIAConnected, getPIACurrentRegion } from "./utils";

export default async function Command() {
  let text = "🔴 You are currently disconnected from PIA";
  const connected = await isPIAConnected();
  if (connected) {
    const region = await getPIACurrentRegion();
    text = `🟢 You are currently connected to PIA (${region})`;
  }
  await showHUD(text);
}
