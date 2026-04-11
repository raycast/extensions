import { environment, LaunchType, showHUD } from "@raycast/api";
import { listPages, listTags, getStats } from "./api/client";
import { setCachedPages, setCachedTags, setCachedStats } from "./shared-cache";

export default async function BackgroundSyncCommand() {
  const isUserLaunched = environment.launchType === LaunchType.UserInitiated;

  try {
    const [pagesResult, tagsResult, statsResult] = await Promise.all([
      listPages({ limit: 50 }),
      listTags(),
      getStats(),
    ]);

    setCachedPages(pagesResult.pages);
    setCachedTags(tagsResult);
    setCachedStats(statsResult);

    if (isUserLaunched) {
      await showHUD("Library cache refreshed");
    }
  } catch (error) {
    if (isUserLaunched) {
      await showHUD("Sync failed — check your connection");
    }
    // Background failures are silently ignored — next interval will retry
  }
}
