import { getTodayFeaturedPageTitle } from "./wikipedia";
import { openInBrowser } from "./utils";
import { closeMainWindow } from "@raycast/api";

export default async function () {
  const pageTitle = await getTodayFeaturedPageTitle();
  await openInBrowser(`https://wikipedia.org/wiki/${pageTitle}`);
  await closeMainWindow({ clearRootSearch: true });
}
