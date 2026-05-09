import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { MacAppLibraryNotRunningError, listApps } from "./lib/api";
import { AppItem } from "./components/AppItem";
import { NotRunningView } from "./components/NotRunningView";

export default function RunningApps() {
  const { data, isLoading, revalidate, error } = useCachedPromise(
    () => listApps({ running: true }),
    [],
    { keepPreviousData: true },
  );

  if (error instanceof MacAppLibraryNotRunningError) {
    return <NotRunningView onRetry={revalidate} />;
  }

  const apps = data ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search running apps">
      {apps.length === 0 && !isLoading ? (
        <List.EmptyView title="No apps are currently running" />
      ) : (
        apps.map((app) => (
          <AppItem key={app.bundleID} app={app} onChanged={revalidate} />
        ))
      )}
    </List>
  );
}
