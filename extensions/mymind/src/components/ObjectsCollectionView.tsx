import { Grid, List } from "@raycast/api";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import { MyMindObject } from "../api";
import { dedupeById, ViewMode, VIEW_MODE_KEY } from "../utils";
import { GridCardItem, ListCardItem } from "./CardItem";

interface Props {
  navigationTitle: string;
  load: () => Promise<MyMindObject[]>;
  cacheKey: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function ObjectsCollectionView({ navigationTitle, load, cacheKey, emptyTitle, emptyDescription }: Props) {
  const { value: viewMode = "grid", isLoading: vmLoading } = useLocalStorage<ViewMode>(VIEW_MODE_KEY, "grid");

  const {
    isLoading,
    data: objects = [],
    revalidate,
  } = useCachedPromise(
    // The key arg is what triggers a refetch when cacheKey changes;
    // load() captures the real fetch parameters in its closure.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_key: string) => load(),
    [cacheKey],
    { keepPreviousData: true },
  );

  const items = dedupeById(objects);
  const loading = isLoading || vmLoading;

  if (viewMode === "list") {
    return (
      <List isLoading={loading} navigationTitle={navigationTitle}>
        {items.length === 0 && !loading && (
          <List.EmptyView title={emptyTitle ?? "Nothing here yet"} description={emptyDescription} />
        )}
        {items.map((o) => (
          <ListCardItem key={o.id} object={o} onChange={revalidate} />
        ))}
      </List>
    );
  }

  return (
    <Grid
      isLoading={loading}
      navigationTitle={navigationTitle}
      columns={5}
      aspectRatio="3/2"
      fit={Grid.Fit.Contain}
      inset={Grid.Inset.Medium}
    >
      {items.length === 0 && !loading && (
        <Grid.EmptyView title={emptyTitle ?? "Nothing here yet"} description={emptyDescription} />
      )}
      {items.map((o) => (
        <GridCardItem key={o.id} object={o} onChange={revalidate} />
      ))}
    </Grid>
  );
}
