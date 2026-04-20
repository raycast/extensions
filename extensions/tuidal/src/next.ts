import { showHUD } from "@raycast/api";
import { api } from "./api";

export default async function Next() {
  try {
    await api.next();
    await showHUD("⏭ Next track");
  } catch {
    await showHUD("⚠️ Tuidal not running");
  }
}
