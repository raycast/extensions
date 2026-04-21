import { showToast, Toast, LaunchType } from "@raycast/api";
import { DJANGO_VERSIONS, DjangoVersion } from "../constants";
import { fetchDocEntries } from "../services/django-docs";
import { writeCache, shouldRefresh } from "../services/cache";

interface LaunchContext {
  version?: DjangoVersion;
  forceRefresh?: boolean;
}

export default async function RefreshDocsCommand(props: { launchType: LaunchType; launchContext?: LaunchContext }) {
  const { launchType, launchContext } = props;
  const isBackground = launchType === LaunchType.Background;

  // Determine which versions to refresh
  const versionsToRefresh: DjangoVersion[] = launchContext?.version ? [launchContext.version] : [...DJANGO_VERSIONS];

  const forceRefresh = launchContext?.forceRefresh ?? false;

  for (const version of versionsToRefresh) {
    try {
      // Check if refresh is needed (unless forced)
      if (!forceRefresh) {
        const needsRefresh = shouldRefresh(version);
        if (!needsRefresh) {
          if (!isBackground) {
            await showToast({
              style: Toast.Style.Success,
              title: `Cache for ${version} is up to date`,
            });
          }
          continue;
        }
      }

      if (!isBackground) {
        await showToast({
          style: Toast.Style.Animated,
          title: `Refreshing ${version} docs...`,
        });
      }

      // Fetch fresh documentation
      const entries = await fetchDocEntries(version);

      // Write to cache
      writeCache(version, entries);

      if (!isBackground) {
        await showToast({
          style: Toast.Style.Success,
          title: `Refreshed ${version} docs`,
          message: `${entries.length} pages cached`,
        });
      }
    } catch (error) {
      console.error(`Failed to refresh ${version}:`, error);
      if (!isBackground) {
        await showToast({
          style: Toast.Style.Failure,
          title: `Failed to refresh ${version}`,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }
}
