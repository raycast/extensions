import { BrowserExtension, type LaunchProps, open, showToast, Toast } from "@raycast/api";

interface Arguments {
  url?: string;
}

export default async function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const url = props.arguments.url;

  let processedUrl: string;

  if (url) {
    processedUrl = url.replace(/^https?:\/\//, "");
  } else {
    const tabs = await BrowserExtension.getTabs();

    if (tabs.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No browser tabs found",
        message: "Open a page in your browser first",
      });
      return;
    }

    const currentTab = tabs[0];
    processedUrl = currentTab.url.replace(/^https?:\/\//, "");
  }

  await open(`https://codewiki.google/${processedUrl}`);
}
