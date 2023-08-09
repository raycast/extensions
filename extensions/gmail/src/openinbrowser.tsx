import { showToast, Toast, open, showHUD } from "@raycast/api";
import { getAuthorizedGmailClient, gmailWebUrlBase } from "./lib/gmail";

export default async function OpenInBrowserMain() {
  await getAuthorizedGmailClient({ ensureProfile: true });
  const url = gmailWebUrlBase();
  if (!url) {
    await showToast({ style: Toast.Style.Failure, title: "Error", message: "Could not generate url" });
    return;
  }
  await open(url);
  showHUD("Open in Browser");
}
