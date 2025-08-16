import { Clipboard, Toast, showToast } from "@raycast/api";
import { saveBookmark } from "./lib/bookmark-save";
import { fetchPageTitle } from "./lib/fetch-page-title";
import type { BookmarkItem } from "./lib/types";
import { generateId, isValidUrl } from "./lib/utils";

export default async function AddFromClipboardCommand() {
  const clipboardText = await Clipboard.readText();

  if (!clipboardText) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Clipboard is empty",
      message: "Please copy a URL to clipboard",
    });
    return;
  }

  const trimmedText = clipboardText.trim();

  if (!isValidUrl(trimmedText)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid URL",
      message: "Clipboard content is not a URL",
    });
    return;
  }

  await showToast({
    style: Toast.Style.Animated,
    title: "Processing URL...",
    message: "Fetching title",
  });

  let title: string;
  try {
    title = await fetchPageTitle(trimmedText);
  } catch (error) {
    console.warn("Title fetch failed, using URL as title:", error);
    title = trimmedText;
  }

  const now = Date.now();

  const bookmark: BookmarkItem = {
    id: generateId(trimmedText),
    url: trimmedText,
    title,
    createdAt: now,
    lastAccessedAt: now,
  };

  try {
    await saveBookmark(bookmark);
    await showToast({
      style: Toast.Style.Success,
      title: "Link added",
      message: title,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to save bookmark",
      message: "Please try again",
    });
  }

  await showToast({
    style: Toast.Style.Success,
    title: "Link added",
    message: title,
  });
}
