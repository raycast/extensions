import { showHUD } from "@raycast/api";
import { api } from "./api";

export default async function Shuffle() {
  try {
    const before = await api.status();
    await api.shuffle();
    await showHUD(before.shuffle ? "🔀 Shuffle off" : "🔀 Shuffle on");
  } catch {
    await showHUD("⚠️ Tuidal not running");
  }
}
