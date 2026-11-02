import { BrowserExtension, environment } from "@raycast/api";
import { validateUrl } from "./defuddle";

export async function getActiveBrowserUrls(): Promise<string[]> {
  // Avoid prompting to install the browser extension, including on Windows.
  if (!environment.canAccess(BrowserExtension)) return [];
  try {
    const urls = (await BrowserExtension.getTabs())
      .filter((tab) => tab.active)
      .flatMap((tab) => {
        try {
          return [validateUrl(tab.url)];
        } catch {
          return [];
        }
      });
    return [...new Set(urls)];
  } catch {
    return [];
  }
}
