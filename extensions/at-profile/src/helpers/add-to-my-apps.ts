import { failToast } from "@chrismessina/raycast-kit";
import { showToast, Toast } from "@raycast/api";
import type { CatalogSite } from "../catalog/types";
import { addCatalogApp } from "./apps";
import { cacheFavicon } from "./favicons";

/**
 * Add a catalog site to My Apps from a view, with a toast, and save its favicon for next time
 */
export async function addToMyApps(site: CatalogSite): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: `Adding ${site.name}…` });
  try {
    const app = await addCatalogApp(site);
    void cacheFavicon(app.urlTemplate);
    toast.style = Toast.Style.Success;
    toast.title = `Added ${app.name} to My Apps`;
  } catch (error) {
    failToast(toast, error, { title: "Couldn't Add App" });
  }
}
