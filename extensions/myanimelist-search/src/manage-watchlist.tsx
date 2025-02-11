import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  getPreferenceValues,
  Icon,
  List,
  popToRoot,
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
      await api.setEpisodes(anime, parseInt(values.episodes));
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

        const watching = api.fetchAnimeList("watching").then((items) =>
          Promise.all(
            items.map(async (item) => ({
              ...(await api.getAnimeDetails(item)),
              ...item,
              status: "watching",
              episodesWatched: await api.getAnimeEpisodesWatched(item),
            }))
          )
        );
        const planToWatch = api.fetchAnimeList("plan_to_watch").then((items) =>
          Promise.all(
            items.map(async (item) => ({
              ...(await api.getAnimeDetails(item)),
              ...item,
              status: "plan_to_watch",
              episodesWatched: await api.getAnimeEpisodesWatched(item),
            }))
          )
        );

        const fetchedItems = await Promise.all([watching, planToWatch]);

        setItems(fetchedItems.flat());
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
          icon={item.main_picture.medium}
          title={item.title}
          accessories={
            [
              showingDetail ? undefined : { tag: statusToText(item.status) },
              { tag: `${item.episodesWatched}/${item.num_episodes}` },
            ].filter(Boolean) as { tag: string }[]
          }
          {...(showingDetail
            ? {
                detail: <AnimeDetails anime={item} />,
              }
            : { accessories: [{ tag: item.mean?.toString() || "-" }] })}
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
                    const newEps = await api.incrementEpisodes(item);
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
