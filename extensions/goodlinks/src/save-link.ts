import { Clipboard, showToast, Toast } from "@raycast/api";
import { saveLink } from "./api/save-link";
import { isApplicationInstalled, showMustBeInstalledToast } from "./utils/isApplicationInstalled";

async function getURLFromClipboard() {
  const possibleUrl = await Clipboard.readText();

  if (!possibleUrl) {
    await showToast({
      title: "Your clipboard is empty.",
      style: Toast.Style.Failure,
    });
    return null;
  }

  try {
    new URL(possibleUrl);
    return possibleUrl;
  } catch {
    await showToast({
      title: "Your clipboard does not contain a valid URL",
      style: Toast.Style.Failure,
    });
    return null;
  }
}
export default async function command() {
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
}
