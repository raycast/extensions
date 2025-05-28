import { getSelectedText, showToast, Toast } from "@raycast/api";
import Notifications from "./ui/Notifications";
import { saveTextToPieces } from "./actions/saveAsset";
import piecesHealthCheck from "./connection/health/piecesHealthCheck";

export default async function Command() {
  const healthy = await piecesHealthCheck();
  if (!healthy) return;
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Reading text selection",
  });
  const text = await getSelectedText().catch(() => null);
  toast.hide();

  if (!text?.trim()) {
    return await Notifications.getInstance().errorToast(
      "No text detected. Ensure 'Accessibility' permissions are enabled for Raycast on your device",
    );
  }

  await saveTextToPieces(text);
}
