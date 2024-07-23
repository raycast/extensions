import { getSelectedText } from "@raycast/api";
import Notifications from "./ui/Notifications";
import { saveTextToPieces } from "./actions/saveAsset";
import piecesHealthCheck from "./connection/health/piecesHealthCheck";

export default async function Command() {
  const healthy = await piecesHealthCheck();
  if (!healthy) return;

  const text = await getSelectedText().catch(() => null);

  if (!text?.trim()) {
    return await Notifications.getInstance().errorToast(
      "There is no text selected in the frontmost application!",
    );
  }

  await saveTextToPieces(text);
}
