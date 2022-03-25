import { encodeTitle, getTodayFeaturedPageTitle } from "./wikipedia";
import { closeMainWindow, open } from "@raycast/api";

export default async function () {
  const pageTitle = await getTodayFeaturedPageTitle();
  await open(`https://wikipedia.org/wiki/${encodeTitle(pageTitle)}`);
  await closeMainWindow({ clearRootSearch: true });
}
