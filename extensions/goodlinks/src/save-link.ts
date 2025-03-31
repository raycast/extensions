import { Clipboard, showToast, Toast } from "@raycast/api";
import { saveLink } from "./api/save-link";
import { isApplicationInstalled, showMustBeInstalledToast } from "./utils/isApplicationInstalled";
import { showFailureToast } from "@raycast/utils";

async function getURLFromClipboard() {
  const possibleUrl = await Clipboard.readText();

  if (!possibleUrl) {
    await showFailureToast("Your clipboard is empty.");
    return null;
  }

  try {
    new URL(possibleUrl);
    return encodeURI(possibleUrl);
  } catch {
    await showFailureToast("Your clipboard does not contain a valid URL");
    return null;
  }
}
export default async function saveLinkFromClipboard() {
  try {
    const isInstalled = await isApplicationInstalled();

    if (!isInstalled) {
      await showMustBeInstalledToast();
      return;
    }

    const linkURL = await getURLFromClipboard();

    if (!linkURL) {
      return;
    }

    await saveLink(linkURL);
    await showToast({
      title: "Link saved!",
      style: Toast.Style.Success,
    });
  } catch (error) {
    await showFailureToast(error);
  }
}
