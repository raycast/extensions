import { Action, ActionPanel, Grid, Icon, Keyboard, Toast, showToast } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { setMaxListeners } from "events";
import { AbortError } from "node-fetch";
import { useEffect, useRef, useState } from "react";
import { Seasons } from "./components/seasons";
import { View } from "./components/view";
import { getIMDbUrl, getPosterUrl, getTraktUrl } from "./lib/helper";
import { checkInEpisode, getUpNextShows, updateShowProgress } from "./services/shows";
import { getTMDBShowDetails } from "./services/tmdb";

const OnDeckCommand = () => {
  const abortable = useRef<AbortController>();
  const [isLoading, setIsLoading] = useState(false);
  const [shows, setShows] = useState<TraktUpNextShowList | undefined>();
  const [x, forceRerender] = useState(0);

  useEffect(() => {
    (async () => {
      abortable.current = new AbortController();
      setMaxListeners(100, abortable.current?.signal);
      setIsLoading(true);

      try {
        const shows = await getUpNextShows(abortable.current?.signal);
        setShows(shows);

        const showsWithImages = (await Promise.all(
          shows.map(async (show) => {
            show.show.details = await getTMDBShowDetails(show.show.ids.tmdb, abortable.current?.signal);
            return show;
          }),
        )) as TraktUpNextShowList;

        setShows(showsWithImages);
      } catch (e) {
        if (!(e instanceof AbortError)) {
          showToast({
            title: "Error getting on deck shows",
            style: Toast.Style.Failure,
          });
        }
      }
      setIsLoading(false);
      return () => {
        if (abortable.current) {
          abortable.current.abort();
        }
      };
    })();
  }, [x]);

  const onCheckInNextEpisode = async (episodeId: number | undefined, showId: number) => {
    if (episodeId) {
      setIsLoading(true);
      try {
        await checkInEpisode(episodeId, abortable.current?.signal);
        await updateShowProgress(showId, abortable.current?.signal);
        showToast({
          title: "Episode checked in",
          style: Toast.Style.Success,
        });
      } catch (e) {
        if (!(e instanceof AbortError)) {
          showToast({
            title: "Error checking in episode",
            style: Toast.Style.Failure,
          });
        }
      }
      setIsLoading(false);
      forceRerender((value) => value + 1);
    }
  };

  return (
    <Grid
      isLoading={isLoading}
      aspectRatio="9/16"
      fit={Grid.Fit.Fill}
      searchBarPlaceholder="Search for shows that are up next"
      throttle={true}
    >
      {shows &&
        shows.map((show) => (
          <Grid.Item
            title={show.show.title}
            subtitle={`${show.show.progress?.next_episode?.season}x${show.show.progress?.next_episode?.number.toString().padStart(2, "0")}`}
            content={getPosterUrl(show.show.details?.poster_path, "poster.png")}
            key={show.show.ids.trakt}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    icon={getFavicon("https://trakt.tv")}
                    title="Open in Trakt"
                    url={getTraktUrl("shows", show.show.ids.slug)}
                  />
                  <Action.OpenInBrowser
                    icon={getFavicon("https://www.imdb.com")}
                    title="Open in IMDb"
                    url={getIMDbUrl(show.show.ids.imdb)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.Push
                    icon={Icon.Switch}
                    title="Seasons"
                    shortcut={Keyboard.Shortcut.Common.Open}
                    target={
                      <Seasons
                        traktId={show.show.ids.trakt}
                        tmdbId={show.show.ids.tmdb}
                        slug={show.show.ids.slug}
                        imdbId={show.show.ids.imdb}
                      />
                    }
                  />
                  <Action
                    icon={Icon.Checkmark}
                    title={"Check-in Next Episode"}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    onAction={() =>
                      onCheckInNextEpisode(show.show.progress?.next_episode?.ids.trakt, show.show.ids.trakt)
                    }
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
    </Grid>
  );
};

export default function Command() {
  return (
    <View>
      <OnDeckCommand />
    </View>
  );
}
