import { closeMainWindow, open } from "@raycast/api";
import { getTodayFeaturedPageUrl } from "./wikipedia";

export default async function () {
  const featurePageUrl = await getTodayFeaturedPageUrl();
  await open(featurePageUrl);
  await closeMainWindow({ clearRootSearch: true });
}
