import { popToRoot, showHUD, Clipboard, closeMainWindow, LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getLatestDownloads, hasAccessToDownloadsFolder } from "./utils";

export default async function main(props: LaunchProps<{ arguments: Arguments.PasteLatestDownload }>) {
  if (!hasAccessToDownloadsFolder()) {
    await showHUD("No permission to access the downloads folder");
    return;
  }

  let downloads;
  try {
    const quantity = props.arguments.quantity ? parseInt(props.arguments.quantity, 10) || 1 : 1;
    downloads = getLatestDownloads(quantity);
  } catch (error) {
    await showFailureToast(error, { title: "Could not get latest downloads" });
    return;
  }

  if (downloads.length === 0) {
    await showHUD("No downloads found");
    return;
  }

  try {
    for (let i = 0; i < downloads.length; i++) {
      await Clipboard.paste({ file: downloads[i].path });
      // Add a small delay between pastes to ensure each one completes
      if (i < downloads.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    await closeMainWindow();
    const message = downloads.length === 1 ? "Pasted latest download" : `Pasted ${downloads.length} downloads`;
    await showHUD(message);
    await popToRoot();
  } catch (error) {
    await showFailureToast(error, { title: "Could not paste downloads" });
  }
}
