import { showToast, Toast, Cache, popToRoot, LaunchType, environment } from "@raycast/api";
import { getCommands, processEntryAdditions, processEntryRemovals } from "./utils";

const cache = new Cache();

export default async function Main() {
  if (environment.launchType == LaunchType.UserInitiated) {
    popToRoot();
  }

  const cachedPages = cache.get("manPages")?.split("\n");
  const pages = await getCommands();
  processEntryRemovals(pages);
  processEntryAdditions(pages);

  let numChanged = 0;
  if (cachedPages) {
    numChanged = pages.length - cachedPages.length;
  }

  if (environment.launchType == LaunchType.UserInitiated) {
    await showToast({
      style: Toast.Style.Success,
      title: "Man Page Entries Updated",
      message: numChanged >= 0 ? `${numChanged} entries added` : `${-numChanged} entries removed`,
    });
  }
}
