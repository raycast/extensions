import { open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { DOWNLOAD_URL, findEdits, openEdits } from "./lib/application";

export default async function Command() {
  try {
    const application = await findEdits();
    if (application) return await openEdits(application);
    await showFailureToast(new Error("Edits was not found"), {
      title: "Edits was not found",
      message: "Install Edits for Mac, then try again.",
      primaryAction: { title: "Download Edits", onAction: () => open(DOWNLOAD_URL) },
    });
  } catch {
    await showFailureToast(new Error("Could not find Edits"), {
      title: "Could not find Edits",
      message: "Check extension preferences and try again.",
    });
  }
}
