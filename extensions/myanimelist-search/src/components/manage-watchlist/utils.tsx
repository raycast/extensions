import { Action, ActionPanel, Form, PopToRootType, showHUD, showToast, Toast } from "@raycast/api";

import * as api from "../../api/api";
import { useForm } from "@raycast/utils";

interface SetEpisodesWatchedValues {
  episodes: string;
}

export async function getWatchlistItems(
  limit = 30,
  offset = 0
): Promise<(api.ExtendedAnime & { status: string; episodesWatched: number })[]> {
  const watchlist = await api.getDetailedWatchlist(["watching", "plan_to_watch"], limit, offset);

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
    case "finished_airing":
      return "Finished Airing";
    case "currently_airing":
      return "Currently Airing";
    case "not_yet_aired":
      return "Not Yet Aired";
    default:
      return status;
  }
}

export function SetEpisodesWatched({ anime }: { anime: api.ExtendedAnime }) {
  const { handleSubmit, itemProps } = useForm<SetEpisodesWatchedValues>({
    onSubmit: async (values) => {
      const cacheKey = `episodes_${anime.id}`;

      try {
        await api.setEpisodes(anime, parseInt(values.episodes));
        api.cacheRemove(cacheKey);
        api.removeCachedWatchlist();
        await showHUD(`${anime.title} now has ${values.episodes} episodes watched.`, {
          popToRootType: PopToRootType.Immediate,
        });
      } catch (error) {
        console.error(error);
        await showToast({ style: Toast.Style.Failure, title: String(error) });
      }
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
