import { showHUD, showToast, Toast } from "@raycast/api";
import { syncScripts } from "./foxhop";

export default async function Command() {
  try {
    const result = await syncScripts();
    await showHUD(result || "Scripts generated");
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Sync failed",
      message: String(err),
    });
  }
}
