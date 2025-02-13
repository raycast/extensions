import { Action, ActionPanel, Form, PopToRootType, showHUD } from "@raycast/api";

import * as api from "../../api/api";
import { useForm } from "@raycast/utils";

interface SetEpisodesWatchedValues {
  episodes: string;
}

export async function getWatchlistItems(): Promise<
  (api.ExtendedAnime & { status: string; episodesWatched: number })[]
> {
  const watchlist = await api.getDetailedWatchlist(["watching", "plan_to_watch"]);

  const fetchedItems = await Promise.all(
    watchlist.map(async (item) => ({
      ...item,
      episodesWatched: await api.getAnimeEpisodesWatched(item, true),
    }))
  );

  return fetchedItems;
}

export function statusToText(status: string) {
  switch (status) {
    case "watching":
      return "Watching";
    case "plan_to_watch":
      return "Plan to Watch";
    default:
      return status;
  }
}

export function SetEpisodesWatched({ anime }: { anime: api.ExtendedAnime }) {
  const { handleSubmit, itemProps } = useForm<SetEpisodesWatchedValues>({
    onSubmit: async (values) => {
      const cacheKey = `episodes_${anime.id}`;

      await api.setEpisodes(anime, parseInt(values.episodes));
      api.cacheRemove(cacheKey);
      api.removeCachedWatchlist();
      await showHUD(`${anime.title} now has ${values.episodes} episodes watched.`, {
        popToRootType: PopToRootType.Immediate,
      });
    },
    validation: {
      episodes: (value) => {
        if (!value) {
          return "Episodes Watched is required";
        }
        if (!/^\d+$/.test(value)) {
          return "Episodes Watched must be a number";
        }
        return null;
      },
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Episodes Watched" placeholder="12" {...itemProps.episodes} />
    </Form>
  );
}
