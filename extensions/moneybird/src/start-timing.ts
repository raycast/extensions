import { showHUD, LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export default async function main() {
  try {
    const now = new Date();
    await LocalStorage.setItem("startTime", now.toISOString());
    await showHUD("Timing started at: " + now.toLocaleString());
  } catch {
    await showFailureToast({ title: "Failed to start timing" });
  }
}
