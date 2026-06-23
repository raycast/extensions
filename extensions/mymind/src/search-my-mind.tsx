import { Grid, List, showToast, Toast, openExtensionPreferences } from "@raycast/api";
import { useState } from "react";
import { showFailureToast, useCachedPromise, useLocalStorage } from "@raycast/utils";
import { listObjects, MyMindApiError, MyMindObject } from "./api";
import { GridCardItem, ListCardItem } from "./components/CardItem";
import { dedupeById, ViewMode, VIEW_MODE_KEY } from "./utils";

const SEARCH_LIMIT = 50;
const BROWSE_LIMIT = 200;

async function loadObjects(query: string): Promise<MyMindObject[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return dedupeById(await listObjects({ limit: BROWSE_LIMIT }));
  }
  return dedupeById(
    await listObjects({
      q: trimmed,
      limit: SEARCH_LIMIT,
      semantic: true,
      rerank: true,
    }),
  );
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

  const items = objects ?? [];
  const loading = isLoading || viewModeLoading;

  if (viewMode === "list") {
    return (
      <List
        isLoading={loading}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder="Search… try tag:foo, type:Note, created:2026"
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
      fit={Grid.Fit.Fill}
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
