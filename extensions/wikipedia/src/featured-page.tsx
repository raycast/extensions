import { getTodayFeaturedPageTitle } from "./wikipedia";
import { closeMainWindow, open } from "@raycast/api";

export default async function () {
  const pageTitle = await getTodayFeaturedPageTitle();
  await open(`https://wikipedia.org/wiki/${pageTitle.replaceAll(" ", "_")}`);
  await closeMainWindow({ clearRootSearch: true });
}
