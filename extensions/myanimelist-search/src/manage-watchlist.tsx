import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  Image,
  List,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";

import * as oauth from "./api/oauth";
import * as api from "./api/api";
import { useForm } from "@raycast/utils";
import AnimeDetails from "./components/listDetail";

function statusToText(status: string) {
  switch (status) {
    case "watching":
      return "Watching";
    case "plan_to_watch":
      return "Plan to Watch";
    default:
      return status;
  }
}

interface SetEpisodesWatchedValues {
  episodes: string;
}

function SetEpisodesWatched({ anime }: { anime: api.ExtendedAnime }) {
  const { handleSubmit, itemProps } = useForm<SetEpisodesWatchedValues>({
    onSubmit: async (values) => {
      const cacheKey = `episodes_${anime.id}`;

      await showHUD(`${anime.title} now has ${values.episodes} episodes watched.`, {
        popToRootType: PopToRootType.Immediate,
      });
      await api.setEpisodes(anime, parseInt(values.episodes));
      api.cacheRemove(cacheKey);
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

export default function Command() {
  const preferences = getPreferenceValues();
  const showDetailDefault = preferences.view;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [items, setItems] = useState<(api.ExtendedAnime & { status: string; episodesWatched: number })[]>([]);

  const [showingDetail, setShowingDetail] = useState(showDetailDefault == "list-detailed");

  useEffect(() => {
    (async () => {
      try {
        await oauth.authorize();

        const watchlist = await api.getDetailedWatchlist(["watching", "plan_to_watch"]);

        const fetchedItems = await Promise.all(
          watchlist.map(async (item) => ({
            ...item,
            episodesWatched: await api.getAnimeEpisodesWatched(item, true),
          }))
        );

        setItems(fetchedItems);
        setIsLoading(false);
      } catch (error) {
        console.error(error);
        setIsLoading(false);
        showToast({ style: Toast.Style.Failure, title: String(error) });
      }
    })();
  }, []);

  return (
    <List isLoading={isLoading} isShowingDetail={showingDetail}>
      {items.map((item) => (
        <List.Item
          key={item.id}
          icon={{
            source: item.main_picture.medium,
            mask: Image.Mask.Circle,
          }}
          title={item.title}
          accessories={
            showingDetail
              ? [{ tag: `${item.episodesWatched}/${item.num_episodes}` }]
              : [{ tag: statusToText(item.status) }, { tag: `${item.episodesWatched}/${item.num_episodes}` }]
          }
          detail={showingDetail && <AnimeDetails anime={item} />}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://myanimelist.net/anime/${item.id}`} />
              <Action
                title="Toggle Detailed View"
                onAction={() => setShowingDetail(!showingDetail)}
                icon={Icon.AppWindowSidebarLeft}
              />
              <ActionPanel.Section>
                <Action
                  title="Increment Episodes Watched"
                  onAction={async () => {
                    const cacheKey = `episodes_${item.id}`;

                    const newEps = await api.incrementEpisodes(item);
                    api.cacheRemove(cacheKey);
                    await showHUD(`${item.title} now has ${newEps} episodes watched.`, {
                      popToRootType: PopToRootType.Immediate,
                    });
                  }}
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
                <Action.Push
                  title="Set Episodes Watched"
                  target={<SetEpisodesWatched anime={item} />}
                  icon={Icon.Keyboard}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  content={`https://myanimelist.net/anime/${item.id}`}
                  title="Copy Link"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  icon={Icon.Link}
                />
                {item.alternative_titles.ja && (
                  <Action.CopyToClipboard
                    content={item.title}
                    title="Copy Original Title"
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                  />
                )}
                {item.alternative_titles.en && (
                  <Action.CopyToClipboard
                    content={item.alternative_titles.en}
                    title="Copy English Title"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                  />
                )}
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
