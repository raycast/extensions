import { BrowserExtension, Clipboard } from "@raycast/api";
import { showToast, Toast } from "@raycast/api";

export default async function command() {
  const prTitle = await BrowserExtension.getContent({
    format: "text",
    cssSelector: ".js-issue-title",
  });

  if (!prTitle) {
    showToast({
      style: Toast.Style.Failure,
      title: "Something went wrong",
      message: "Couldn't find GitHub title",
    });
    return;
  }

  const tabs = await BrowserExtension.getTabs();
  const currentTab = tabs.find((tab) => tab.active === true);
  if (!currentTab) {
    showToast({
      style: Toast.Style.Failure,
      title: "Something went wrong",
      message: "Couldn't find active tab",
    });
    return;
  }

  const prURL = currentTab.url;
  const link = `[${prTitle}](${prURL})`;

  await Clipboard.copy(link);

  showToast({
    style: Toast.Style.Success,
    title: "Success",
    message: "Copied PR link to clipboard",
  });
}
