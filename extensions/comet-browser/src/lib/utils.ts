import { showToast, Toast, Clipboard, Image } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { CometError } from "./types";

export function formatUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.hostname}${urlObj.pathname !== "/" ? urlObj.pathname : ""}`;
  } catch {
    return url;
  }
}

export function formatDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function formatTimestamp(timestamp: number): string {
  // Comet uses WebKit timestamp (microseconds since Jan 1, 1601)
  // Convert to JavaScript timestamp (milliseconds since Jan 1, 1970)
  const WEBKIT_TO_UNIX_EPOCH_OFFSET = 11644473600000000; // microseconds
  const jsTimestamp = (timestamp - WEBKIT_TO_UNIX_EPOCH_OFFSET) / 1000;

  const date = new Date(jsTimestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}

export async function copyToClipboard(text: string, title: string): Promise<void> {
  await Clipboard.copy(text);
  await showToast({
    style: Toast.Style.Success,
    title: "Copied to Clipboard",
    message: title,
  });
}

export async function copyAsMarkdown(title: string, url: string): Promise<void> {
  const markdown = `[${title}](${url})`;
  await copyToClipboard(markdown, "Markdown link");
}

export async function handleError(error: unknown, context?: string): Promise<void> {
  console.error(`Error in ${context || "unknown context"}:`, error);

  if (error instanceof Error) {
    const cometError = error as CometError;

    if (cometError.code === "APPLESCRIPT_ERROR") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Connection Error",
        message: "Unable to communicate with Comet browser",
      });
    } else if (cometError.code === "TAB_SWITCH_ERROR") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Tab Switch Failed",
        message: "Could not switch to the selected tab",
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error.message || "An unexpected error occurred",
      });
    }
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: "Unexpected Error",
      message: "Something went wrong",
    });
  }
}

export function getTabIcon(url: string): Image.ImageLike {
  try {
    // Special handling for newtab pages - use the extension icon
    if (url === "newtab" || url.includes("newtab") || url === "chrome://newtab/" || url === "comet://newtab/") {
      return { source: "comet-icon.png" };
    }

    // Use getFavicon from @raycast/utils for real website favicons
    // with rounded rectangle mask for better visual consistency
    return getFavicon(url, {
      mask: Image.Mask.RoundedRectangle,
      fallback: { source: "🌐" }, // Fallback emoji for sites without favicons
    });
  } catch {
    return { source: "🌐" };
  }
}

// Legacy function for backward compatibility with emoji icons
export function getEmojiIcon(url: string): string {
  try {
    const domain = formatDomain(url);

    // Common site icons
    const iconMap: Record<string, string> = {
      "github.com": "🐱",
      "google.com": "🔍",
      "gmail.com": "📧",
      "mail.google.com": "📧",
      "youtube.com": "📺",
      "twitter.com": "🐦",
      "x.com": "🐦",
      "linkedin.com": "💼",
      "facebook.com": "📘",
      "instagram.com": "📷",
      "reddit.com": "🟠",
      "stackoverflow.com": "💻",
      "medium.com": "📝",
      "notion.so": "📝",
      "figma.com": "🎨",
      "slack.com": "💬",
      "discord.com": "🎮",
      "netflix.com": "🎬",
      "spotify.com": "🎵",
      "amazon.com": "📦",
      "perplexity.ai": "🔮",
    };

    return iconMap[domain] || "🌐";
  } catch {
    return "🌐";
  }
}
