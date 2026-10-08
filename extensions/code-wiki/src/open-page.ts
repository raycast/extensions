import { BrowserExtension, type LaunchProps, open, showToast, Toast } from "@raycast/api";
import { stripUrl } from "./lib/strip-url";

interface Arguments {
  url?: string;
}

export default async function Command(props: LaunchProps<{ arguments: Arguments }>) {
  let urlToOpen: string;

  if (props.arguments.url) {
    urlToOpen = props.arguments.url;
  } else {
    const tabs = await BrowserExtension.getTabs();

    const activeTab = tabs.find((tab) => tab.active);

    if (!activeTab) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No browser tabs found",
        message: "Open a page in your browser first",
      });
      return;
    }

    urlToOpen = activeTab.url;
  }

  await open(`https://codewiki.google/${stripUrl(urlToOpen)}`);
}
