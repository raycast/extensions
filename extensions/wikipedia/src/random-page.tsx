import { closeMainWindow, open } from "@raycast/api";
import { encodeTitle, getRandomPageTitle } from "./wikipedia";

export default async function () {
  const pageTitle = await getRandomPageTitle();
  await open(`https://wikipedia.org/wiki/${encodeTitle(pageTitle)}`);
  await closeMainWindow({ clearRootSearch: true });
}
