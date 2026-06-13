import { showHUD, Toast, showToast } from "@raycast/api";
import { syncRules } from "./sync";

export default async function Command() {
  await showToast({ style: Toast.Style.Animated, title: "Syncing Team Rules..." });
  try {
    const count = await syncRules();
    await showHUD(`Synced ${count} team rules successfully 🛡️`);
  } catch (error: any) {
    await showHUD(`Failed to sync rules: ${error.message} ❌`);
  }
}
