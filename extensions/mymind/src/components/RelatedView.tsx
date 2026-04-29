import { Grid, List, Icon } from "@raycast/api";
import { useCachedPromise, useLocalStorage, showFailureToast } from "@raycast/utils";
import { getObject, getRelated, MyMindApiError, MyMindObject } from "../api";
import { GridCardItem, ListCardItem } from "./CardItem";

type ViewMode = "grid" | "list";
const VIEW_MODE_KEY = "mymind:viewMode";
const RELATED_LIMIT = 50;
const UNAVAILABLE_HINT =
  "GET /objects/:id/related returned 404. The endpoint requires Mastermind and may not yet be active on your account — contact mymind support if it stays unavailable.";

function dedupeById(objects: MyMindObject[]): MyMindObject[] {
  const seen = new Set<string>();
  return objects.filter((o) => {
    if (seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  });
}

async function loadRelated(id: string): Promise<MyMindObject[]> {
  const matches = await getRelated(id, RELATED_LIMIT);
  if (matches.length === 0) return [];
  const fetched = await Promise.all(matches.map((m) => getObject(m.id).catch(() => null)));
  return dedupeById(fetched.filter((o): o is MyMindObject => o !== null));
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
  const items = Array.from(new Map(objects.map((o) => [o.id, o])).values());

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
        {items.map((o) => (
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
      {items.map((o) => (
        <GridCardItem key={o.id} object={o} onChange={revalidate} />
      ))}
    </Grid>
  );
}
