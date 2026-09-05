import { BrowserExtension, open, openExtensionPreferences, showToast, Toast } from "@raycast/api";

import { InvalidApiKeyError, postArticle } from "./lib/api";
import { extractFromHtml } from "./lib/extractor";
import { getPreferences } from "./lib/preferences";

const BROWSER_EXTENSION_URL = "https://www.raycast.com/browser-extension";

const isBrowserExtensionMissing = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  // Raycast SDK surfaces "Raycast Browser Extension is not installed" /
  // "The Raycast Browser Extension is not running" depending on state.
  return (
    message.includes("browser extension") && (message.includes("not installed") || message.includes("not running"))
  );
};

export default async function SaveActiveTab(): Promise<void> {
  const { apiKey } = getPreferences();

  if (!apiKey) {
    await showToast({
      style: Toast.Style.Failure,
      title: "API key required",
      message: "Set it in FlowFerry extension preferences.",
      primaryAction: {
        title: "Open Preferences",
        onAction: () => openExtensionPreferences(),
      },
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Saving to FlowFerry…",
  });

  try {
    let tabUrl: string;
    let tabTitle = "";
    let html: string;

    try {
      const tabs = await BrowserExtension.getTabs();
      const active = tabs.find((t) => t.active) ?? tabs[0];
      if (!active?.url) {
        throw new Error("No active browser tab.");
      }
      tabUrl = active.url;
      tabTitle = active.title ?? "";
      html = await BrowserExtension.getContent({ format: "html" });
    } catch (e) {
      if (isBrowserExtensionMissing(e)) {
        toast.style = Toast.Style.Failure;
        toast.title = "Raycast Browser Extension required";
        toast.message = "Install the companion to enable this command.";
        toast.primaryAction = {
          title: "Install Browser Extension",
          onAction: () => open(BROWSER_EXTENSION_URL),
        };
        return;
      }
      throw e;
    }

    const article = await extractFromHtml(html, tabUrl);

    const articleTitle = article.title || tabTitle || tabUrl;
    await postArticle(apiKey, {
      title: articleTitle,
      // The FlowFerry reader expects the title as a leading h1 inside the body
      // (same convention as the browser extension's save flow).
      content: `# ${articleTitle}\n\n${article.content}`,
      url: article.url,
      description: article.excerpt,
      cover: article.leadImageUrl,
    });

    toast.style = Toast.Style.Success;
    toast.title = "Saved to FlowFerry";
    toast.message = articleTitle;
  } catch (e) {
    if (e instanceof InvalidApiKeyError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Invalid API key";
      toast.message = "Update it in extension preferences.";
      toast.primaryAction = {
        title: "Open Preferences",
        onAction: () => openExtensionPreferences(),
      };
      return;
    }
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't save";
    toast.message = e instanceof Error ? e.message : String(e);
  }
}
