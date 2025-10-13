import { Clipboard, closeMainWindow, showToast, Toast } from "@raycast/api";
import { getCurrentTabURL } from "./safari";

export default async function Command() {
  try {
    await closeMainWindow();

    const currentURL = await getCurrentTabURL();
    await Clipboard.copy(currentURL);

    await showToast({
      style: Toast.Style.Success,
      title: "Copied URL to clipboard",
    });
  } catch (error) {
    console.error(error);

    await showToast({
      style: Toast.Style.Failure,
      title: "Failed copying URL to clipboard",
      message: error instanceof Error ? error.message : undefined,
    });
  }
}
