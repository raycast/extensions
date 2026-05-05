import { Grid, List, Icon } from "@raycast/api";
import { useCachedPromise, useLocalStorage, showFailureToast } from "@raycast/utils";
import { listObjects, MyMindApiError, MyMindObject } from "../api";
import { dedupeById, ViewMode, VIEW_MODE_KEY } from "../utils";
import { GridCardItem, ListCardItem } from "./CardItem";

const RELATED_LIMIT = 50;
const NOT_EMBEDDED_HINT =
  "This card hasn't been indexed for similarity yet. mymind embeds new objects in the background — try again in a few minutes.";

function isNotEmbedded(err: unknown): boolean {
  return err instanceof MyMindApiError && /embedding/i.test(err.message);
}

async function loadRelated(id: string): Promise<MyMindObject[]> {
  return dedupeById(await listObjects({ similarTo: id, limit: RELATED_LIMIT }));
}

export function RelatedView({ source }: { source: MyMindObject }) {
  const { value: viewMode = "grid", isLoading: vmLoading } = useLocalStorage<ViewMode>(VIEW_MODE_KEY, "grid");

  const {
    isLoading,
    data: objects = [],
    error,
    revalidate,
  } = useCachedPromise(loadRelated, [source.id], {
    onError(err) {
      if (isNotEmbedded(err)) return;
      showFailureToast(err, { title: "Failed to fetch related" });
    },
  });

  const loading = isLoading || vmLoading;
  const navTitle = source.title ? `Related to "${source.title}"` : "Related";

  if (error && isNotEmbedded(error)) {
    return (
      <List navigationTitle={navTitle}>
        <List.EmptyView icon={Icon.Stars} title="No similar cards yet" description={NOT_EMBEDDED_HINT} />
      </List>
    );
  }

  if (viewMode === "list") {
    return (
      <List isLoading={loading} navigationTitle={navTitle}>
        {objects.map((o) => (
          <ListCardItem key={o.id} object={o} onChange={revalidate} />
        ))}
      </List>
    );
  }

  return (
    <Grid isLoading={loading} navigationTitle={navTitle} columns={5} aspectRatio="3/2" fit={Grid.Fit.Fill}>
      {objects.map((o) => (
        <GridCardItem key={o.id} object={o} onChange={revalidate} />
      ))}
    </Grid>
  );
}
