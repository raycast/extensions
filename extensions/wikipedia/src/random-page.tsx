import { closeMainWindow, open } from "@raycast/api";
import { getRandomPageUrl } from "./wikipedia";

export default async function () {
  const randomPageUrl = await getRandomPageUrl();
  await open(randomPageUrl);
  await closeMainWindow({ clearRootSearch: true });
}
