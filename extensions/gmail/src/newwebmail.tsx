import { showToast, Toast, open, showHUD } from "@raycast/api";
import { fullscreenNewMailWebUrl, getAuthorizedGmailClient, getGMailCurrentProfile } from "./lib/gmail";

export default async function NewWebMailMain() {
  const gmail = await getAuthorizedGmailClient();
  const profile = await getGMailCurrentProfile(gmail);
  const url = fullscreenNewMailWebUrl(profile);
  if (!url) {
    await showToast({ style: Toast.Style.Failure, title: "Error", message: "Could not generate url" });
    return;
  }
  await open(url);
  showHUD("Open New Mail in Browser");
}
