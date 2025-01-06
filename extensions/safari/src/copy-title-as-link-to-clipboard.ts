import { Clipboard, closeMainWindow, showToast, Toast } from "@raycast/api";
import { getCurrentTabName, getCurrentTabURL } from "./utils";

export default async function Command() {
  try {
    await closeMainWindow();

    const [title, url] = await Promise.all([getCurrentTabName(), getCurrentTabURL()]);
    await Clipboard.copy({ text: `[${title}](${url})`, html: `<a href="${url}">${title}</a>` });

    await showToast({
      style: Toast.Style.Success,
      title: "Copied title as link to clipboard",
    });
  } catch (error) {
    console.error(error);

    await showToast({
      style: Toast.Style.Failure,
      title: "Failed copying title as link to clipboard",
      message: error instanceof Error ? error.message : undefined,
    });
  }
}
