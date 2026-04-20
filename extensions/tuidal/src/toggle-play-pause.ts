import { showHUD } from "@raycast/api";
import { api } from "./api";

export default async function TogglePlayPause() {
  try {
    const status = await api.status();
    await api.playPause();
    await showHUD(status.state === "playing" ? "⏸ Paused" : "▶ Playing");
  } catch {
    await showHUD("⚠️ Tuidal not running");
  }
}
