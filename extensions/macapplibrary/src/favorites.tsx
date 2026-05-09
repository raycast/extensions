import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { MacAppLibraryNotRunningError, listApps } from "./lib/api";
import { AppItem } from "./components/AppItem";
import { NotRunningView } from "./components/NotRunningView";

export default function Favorites() {
  const { data, isLoading, revalidate, error } = useCachedPromise(
    listApps,
    [],
    { keepPreviousData: true },
  );

  if (error instanceof MacAppLibraryNotRunningError) {
    return <NotRunningView onRetry={revalidate} />;
  }

  const favorites = (data ?? []).filter((app) => app.isFavorite);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search favorite apps">
      {favorites.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No favorites yet"
          description="Mark apps as favorite from the Edit Metadata form."
        />
      ) : (
        favorites.map((app) => (
          <AppItem key={app.bundleID} app={app} onChanged={revalidate} />
        ))
      )}
    </List>
  );
}
