import { closeMainWindow, open, PopToRootType, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import type { SearchEngine } from "./types";
import { isValidUrl } from "./utils";

export async function safeOpenUrl(url: string): Promise<void> {
  if (!isValidUrl(url)) {
    throw new Error(`Invalid URL: ${url}`);
  }
  return open(url);
}

export async function executeSearch(searchEngine: SearchEngine, rawQuery: string): Promise<void> {
  try {
    const trimmedQuery = rawQuery.trim();

    if (!trimmedQuery) {
      const url = new URL(searchEngine.u);
      await safeOpenUrl(url.origin);
    } else {
      const urlsToOpen = searchEngine.urls && searchEngine.urls.length > 1 ? searchEngine.urls : [searchEngine.u];

      for (const urlTemplate of urlsToOpen) {
        const searchUrl = urlTemplate.replace("{{{s}}}", encodeURIComponent(trimmedQuery).replace(/%2F/g, "/"));

        if (!isValidUrl(searchUrl)) {
          throw new Error(`Invalid URL: ${searchUrl}`);
        }

        await safeOpenUrl(searchUrl);
      }

      if (urlsToOpen.length > 1) {
        // A HUD rather than a toast: toasts are rendered inside the main window, so
        // closing the window would tear the confirmation down before it can be read.
        await showHUD(`Opened ${urlsToOpen.length} search tabs · ${trimmedQuery}`, {
          popToRootType: PopToRootType.Immediate,
        });
        return;
      }
    }

    await closeMainWindow({ popToRootType: PopToRootType.Immediate });
  } catch (error) {
    await showFailureToast(error);
  }
}
