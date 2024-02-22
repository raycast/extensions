import { showToast, Toast, open, showHUD } from "@raycast/api";
import { getAuthorizedGmailClient, getGMailCurrentProfile, gmailWebUrlBase } from "./lib/gmail";
import { showFailureToast } from "@raycast/utils";

export default async function OpenInBrowserMain() {
  try {
    const gmail = await getAuthorizedGmailClient();
    const profile = await getGMailCurrentProfile(gmail);
    const url = gmailWebUrlBase(profile);
    if (!url) {
      await showToast({ style: Toast.Style.Failure, title: "Error", message: "Could not generate url" });
      return;
    }
    await open(url);
    showHUD("Open in Browser");
  } catch (error) {
    showFailureToast(error);
  }
}
