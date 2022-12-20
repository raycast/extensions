import { closeMainWindow, open } from "@raycast/api";
import { encodeTitle, getTodayFeaturedPageTitle } from "./wikipedia";

export default async function () {
  const pageTitle = await getTodayFeaturedPageTitle();
  await open(`https://wikipedia.org/wiki/${encodeTitle(pageTitle)}`);
  await closeMainWindow({ clearRootSearch: true });
}
