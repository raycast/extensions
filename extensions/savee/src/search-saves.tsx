import { Grid, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { listFeed, listSaves, MAX_PAGE_SIZE } from "./api";
import { SaveGrid } from "./components/SaveGrid";
import { showSaveeError } from "./errors";

type Scope = "saves" | "feed";

export default function Command() {
  const [scope, setScope] = useState<Scope>("saves");

  const { data, isLoading, pagination, revalidate } = useCachedPromise(
    (currentScope: Scope) => async (options: { cursor?: string }) => {
      const page = currentScope === "feed" ? await listFeed(options.cursor) : await listSaves(options.cursor);
      return { data: page.data, hasMore: page.has_more, cursor: page.next_cursor ?? undefined };
    },
    [scope],
    { onError: showSaveeError },
  );

  return (
    <SaveGrid
      saves={data ?? []}
      isLoading={isLoading}
      searchBarPlaceholder={
        scope === "feed" ? "Filter your feed by title, source or color" : "Filter your saves by title, source or color"
      }
      pagination={pagination ? { ...pagination, pageSize: MAX_PAGE_SIZE } : undefined}
      onRefresh={revalidate}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Show" storeValue onChange={(value) => setScope(value as Scope)}>
          <Grid.Dropdown.Item title="My Saves" value="saves" icon={Icon.Bookmark} />
          <Grid.Dropdown.Item title="Feed" value="feed" icon={Icon.House} />
        </Grid.Dropdown>
      }
      emptyView={
        <Grid.EmptyView
          icon={Icon.Bookmark}
          title={scope === "feed" ? "Your feed is empty" : "No saves yet"}
          description={
            scope === "feed" ? "Follow people on Savee to fill it" : "Save something on savee.com and it shows up here"
          }
        />
      }
    />
  );
}
