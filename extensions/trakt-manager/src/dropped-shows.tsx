import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { SeasonGrid } from "./components/season-grid";
import { useActionRunner } from "./lib/action-runner";
import { initTraktClient } from "./lib/client";
import { TRAKT_APP_URL } from "./lib/constants";
import { getTraktUrl } from "./lib/helper";
import { restoreDroppedShow } from "./lib/media-mutations";
import { type PaginationOptions } from "./lib/pagination";
import { TraktDroppedShow, withPagination } from "./lib/schema";

const PAGE_LIMIT = 50;

export default function Command() {
  const [actionLoading, setActionLoading] = useState(false);
  const traktClient = initTraktClient();

  const { isLoading, data, pagination, revalidate } = useCachedPromise(
    () =>
      async (options: PaginationOptions): Promise<{ data: TraktDroppedShow[]; hasMore: boolean }> => {
        const response = await traktClient.shows.getDroppedShows({
          query: { type: "show", page: options.page + 1, limit: PAGE_LIMIT, extended: "full" },
        });
        if (response.status !== 200) throw new Error("Could not load your dropped shows");
        const page = withPagination(response);
        return {
          data: page.data,
          hasMore: page.pagination["x-pagination-page"] < page.pagination["x-pagination-page-count"],
        };
      },
    [],
    { failureToastOptions: { title: "Could not load your dropped shows" } },
  );

  const run = useActionRunner<TraktDroppedShow>({ setActionLoading, onSuccess: revalidate });

  const restore = (entry: TraktDroppedShow) =>
    run(
      entry,
      async (item) => {
        await restoreDroppedShow(traktClient, item.show.ids.trakt, {});
      },
      `Restored "${entry.show.title}" to Continue Watching`,
    );

  return (
    <List isLoading={isLoading || actionLoading} pagination={pagination} searchBarPlaceholder="Filter dropped shows">
      <List.EmptyView title="No dropped shows" description="Shows you drop from Continue Watching appear here." />
      {data?.map((entry) => (
        <List.Item
          key={entry.show.ids.trakt}
          icon={Icon.Monitor}
          title={entry.show.title}
          subtitle={entry.show.year?.toString()}
          accessories={[{ date: new Date(entry.hidden_at), tooltip: "Dropped on" }]}
          actions={
            <ActionPanel>
              <Action title="Restore" icon={Icon.ArrowCounterClockwise} onAction={() => restore(entry)} />
              <Action.Push
                icon={Icon.Switch}
                title="Browse Seasons"
                target={
                  <SeasonGrid showId={entry.show.ids.trakt} slug={entry.show.ids.slug} imdbId={entry.show.ids.imdb} />
                }
              />
              <Action.OpenInBrowser
                icon={getFavicon(TRAKT_APP_URL)}
                title="Open in Trakt"
                url={getTraktUrl("shows", entry.show.ids.slug)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
