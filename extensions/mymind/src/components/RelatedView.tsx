import { Grid, List, Icon } from "@raycast/api";
import { useCachedPromise, useLocalStorage, showFailureToast } from "@raycast/utils";
import { getObjectsByIds, getRelated, MyMindApiError, MyMindObject } from "../api";
import { dedupeById, ViewMode, VIEW_MODE_KEY } from "../utils";
import { GridCardItem, ListCardItem } from "./CardItem";

const RELATED_LIMIT = 50;
const UNAVAILABLE_HINT =
  "GET /objects/:id/related returned 404. The endpoint requires Mastermind and may not yet be active on your account — contact mymind support if it stays unavailable.";

async function loadRelated(id: string): Promise<MyMindObject[]> {
  const matches = await getRelated(id, RELATED_LIMIT);
  if (matches.length === 0) return [];
  const fetched = await getObjectsByIds(matches.map((m) => m.id));
  const byId = new Map(fetched.map((o) => [o.id, o]));
  return dedupeById(matches.map((m) => byId.get(m.id)).filter((o): o is MyMindObject => o !== undefined));
}

function isUnavailable(error: unknown): boolean {
  return error instanceof MyMindApiError && (error.status === 404 || error.status === 403);
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
      if (isUnavailable(err)) return;
      showFailureToast(err, { title: "Failed to fetch related" });
    },
  });

  const loading = isLoading || vmLoading;
  const navTitle = source.title ? `Related to "${source.title}"` : "Related";

  if (error && isUnavailable(error)) {
    return (
      <List navigationTitle={navTitle}>
        <List.EmptyView icon={Icon.Stars} title="Find Related is unavailable" description={UNAVAILABLE_HINT} />
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
    <Grid
      isLoading={loading}
      navigationTitle={navTitle}
      columns={5}
      aspectRatio="3/2"
      fit={Grid.Fit.Contain}
      inset={Grid.Inset.Medium}
    >
      {objects.map((o) => (
        <GridCardItem key={o.id} object={o} onChange={revalidate} />
      ))}
    </Grid>
  );
}
