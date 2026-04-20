import { showHUD } from "@raycast/api";
import { api } from "./api";

export default async function Previous() {
  try {
    await api.previous();
    await showHUD("⏮ Previous track");
  } catch {
    await showHUD("⚠️ Tuidal not running");
  }
}
