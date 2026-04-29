import { Grid, List, showToast, Toast, openExtensionPreferences } from "@raycast/api";
import { useState } from "react";
import { showFailureToast, useCachedPromise, useLocalStorage } from "@raycast/utils";
import { listObjects, search, getObject, MyMindApiError, MyMindObject } from "./api";
import { GridCardItem, ListCardItem } from "./components/CardItem";

type ViewMode = "grid" | "list";
const VIEW_MODE_KEY = "mymind:viewMode";
const SEARCH_LIMIT = 50;
const BROWSE_LIMIT = 1000;

function dedupeById(objects: MyMindObject[]): MyMindObject[] {
  const seen = new Set<string>();
  return objects.filter((o) => {
    if (seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  });
}

async function loadObjects(query: string): Promise<MyMindObject[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return dedupeById(await listObjects({ limit: BROWSE_LIMIT }));
  }
  const matches = await search({
    q: trimmed,
    limit: SEARCH_LIMIT,
    semantic: true,
    rerank: true,
  });
  if (matches.length === 0) return [];
  const fetched = await Promise.all(matches.map((m) => getObject(m.id).catch(() => null)));
  return dedupeById(fetched.filter((o): o is MyMindObject => o !== null));
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const {
    value: viewMode = "grid",
    setValue: setViewMode,
    isLoading: viewModeLoading,
  } = useLocalStorage<ViewMode>(VIEW_MODE_KEY, "grid");

  const {
    isLoading,
    data: objects,
    revalidate,
  } = useCachedPromise(
    async (query: string) => {
      try {
        return await loadObjects(query);
      } catch (error) {
        if (error instanceof MyMindApiError && error.isUnauthorized) {
          showToast({
            style: Toast.Style.Failure,
            title: "Authentication required",
            message: "Set your access key in extension preferences",
            primaryAction: {
              title: "Open Extension Preferences",
              onAction: openExtensionPreferences,
            },
          });
          return [];
        }
        showFailureToast(error, { title: "Search failed" });
        return [];
      }
    },
    [searchText],
    { keepPreviousData: true },
  );

  const items = Array.from(new Map((objects ?? []).map((o) => [o.id, o])).values());
  const loading = isLoading || viewModeLoading;

  if (viewMode === "list") {
    return (
      <List
        isLoading={loading}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder="Search your mind…"
        searchBarAccessory={
          <List.Dropdown tooltip="View" value={viewMode} onChange={(v) => setViewMode(v as ViewMode)}>
            <List.Dropdown.Item title="Grid" value="grid" />
            <List.Dropdown.Item title="List" value="list" />
          </List.Dropdown>
        }
        throttle
      >
        {items.map((obj) => (
          <ListCardItem key={obj.id} object={obj} onChange={revalidate} />
        ))}
      </List>
    );
  }

  return (
    <Grid
      isLoading={loading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search your mind…"
      columns={5}
      aspectRatio="3/2"
      fit={Grid.Fit.Contain}
      inset={Grid.Inset.Medium}
      searchBarAccessory={
        <Grid.Dropdown tooltip="View" value={viewMode} onChange={(v) => setViewMode(v as ViewMode)}>
          <Grid.Dropdown.Item title="Grid" value="grid" />
          <Grid.Dropdown.Item title="List" value="list" />
        </Grid.Dropdown>
      }
      throttle
    >
      {items.map((obj) => (
        <GridCardItem key={obj.id} object={obj} onChange={revalidate} />
      ))}
    </Grid>
  );
}
