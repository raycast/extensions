import { Clipboard } from "@raycast/api";
import { saveFileToPieces, saveTextToPieces } from "./actions/saveAsset";
import Notifications from "./ui/Notifications";
import piecesHealthCheck from "./connection/health/piecesHealthCheck";

/**
 * This is the entrypoint for save clipboard to pieces
 */
export default async function Command() {
  const healthy = await piecesHealthCheck();
  if (!healthy) return;

  const clipboardValue = await Clipboard.read();
  return await saveClipboardItemToPieces(clipboardValue);
}

export async function saveClipboardItemToPieces(item: Clipboard.ReadContent) {
  if (item.file) {
    return saveFileToPieces(item.file);
  }
  if (!item.text) {
    return Notifications.getInstance().hudNotification(
      "There is nothing in the clipboard to save to Pieces.",
    );
  }

  return saveTextToPieces(item.text);
}
