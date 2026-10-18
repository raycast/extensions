import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { readStoredData } from "./read-stored-items";
import { isTetheredRunning, sendToTethered } from "./send-to-tethered";

async function toggleCompanionSync(): Promise<string> {
  if (!(await isTetheredRunning())) throw new Error("Open Tethered before toggling Companion Sync.");
  const request = crypto.randomUUID();
  await sendToTethered(`tethered://control/companion-sync/toggle?request=${request}`);
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    const result = await readStoredData("raycastCompanionSyncResult").catch(() => undefined);
    if (
      typeof result === "object" &&
      result !== null &&
      "request" in result &&
      result.request === request &&
      "success" in result &&
      typeof result.success === "boolean" &&
      "message" in result &&
      typeof result.message === "string"
    ) {
      if (!result.success) throw new Error(result.message);
      return result.message;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(
    "Tethered did not confirm the request. Update the app and check its Companion Sync settings before retrying.",
  );
}

export default async function Command(): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Updating Companion Sync" });
  try {
    const message = await toggleCompanionSync();
    toast.style = Toast.Style.Success;
    toast.title = "Companion Sync updated";
    toast.message = message;
  } catch (error) {
    await toast.hide();
    await showFailureToast(error, { title: "Could not toggle Companion Sync" });
  }
}
