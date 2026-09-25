import type { LaunchProps } from "@raycast/api";
import { BrowserExtension, Toast, environment, showToast } from "@raycast/api";
import { saveWithFeedback } from "./save-command";
import { normalizeArticleUrl, type SaveDestination } from "./smry";
import { findMatchingTab, readableTabTitle, type BrowserTab } from "./tabs";

type Arguments = {
  url: string;
  destination: SaveDestination;
};

async function matchingOpenTab(articleUrl: string): Promise<BrowserTab | undefined> {
  if (!environment.canAccess(BrowserExtension)) return undefined;
  try {
    return findMatchingTab(await BrowserExtension.getTabs(), articleUrl);
  } catch {
    return undefined;
  }
}

export default async function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const articleUrl = normalizeArticleUrl(props.arguments.url);
  if (!articleUrl) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Choose a Public Link",
      message: "smry accepts public HTTP and HTTPS links only.",
    });
    return;
  }

  const destination = props.arguments.destination === "inbox" ? "inbox" : "later";
  const tab = await matchingOpenTab(articleUrl);
  await saveWithFeedback({
    url: articleUrl,
    title: tab ? readableTabTitle(tab) : undefined,
    destination,
    tabId: tab?.id,
  });
}
