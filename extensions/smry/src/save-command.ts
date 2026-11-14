import { BrowserExtension, Toast, showToast } from "@raycast/api";
import { getSmryPreferences } from "./preferences";
import { saveArticle, type SaveResult } from "./save";
import type { SaveDestination } from "./smry";

export function destinationLabel(destination: SaveDestination): string {
  return destination === "later" ? "Later" : "Inbox";
}

export async function saveWithFeedback(params: {
  url: string;
  title?: string;
  destination: SaveDestination;
  tabId?: number;
}): Promise<SaveResult | null> {
  const preferences = getSmryPreferences();
  const destination = destinationLabel(params.destination);
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Saving to smry ${destination}…`,
  });

  try {
    const result = await saveArticle({
      ...params,
      apiKey: preferences.apiKey,
      getContent: typeof params.tabId === "number" ? BrowserExtension.getContent : undefined,
    });
    toast.style = Toast.Style.Success;
    toast.title = result.alreadySaved ? `Updated in smry ${destination}` : `Saved to smry ${destination}`;
    toast.message = result.captured ? "Rendered page preserved" : result.fallbackDetail;
    return result;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not Save to smry";
    toast.message = error instanceof Error ? error.message : "An unexpected error occurred.";
    return null;
  }
}
