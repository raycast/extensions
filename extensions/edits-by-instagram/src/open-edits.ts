import { open, showToast, Toast } from "@raycast/api";
import { DOWNLOAD_URL, findEdits, openEdits } from "./lib/application";

export default async function Command() {
  try {
    const application = await findEdits();
    if (application) return await openEdits(application);
    await showToast({
      style: Toast.Style.Failure,
      title: "Edits was not found",
      message: "Install Edits for Mac, then try again.",
      primaryAction: { title: "Download Edits", onAction: () => open(DOWNLOAD_URL) },
    });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not find Edits",
      message: "Check extension preferences and try again.",
    });
  }
}
