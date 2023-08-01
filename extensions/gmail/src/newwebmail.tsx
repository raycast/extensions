import { showToast, Toast, open, showHUD } from "@raycast/api";
import { fullscreenNewMailWebUrl, getGmailClient } from "./lib/gmail";

export default async function NewWebMailMain() {
  await getGmailClient({ ensureProfile: true });
  const url = fullscreenNewMailWebUrl();
  if (!url) {
    await showToast({ style: Toast.Style.Failure, title: "Error", message: "Could not generate url" });
    return;
  }
  await open(url);
  showHUD("Open New Mail in Browser");
}
