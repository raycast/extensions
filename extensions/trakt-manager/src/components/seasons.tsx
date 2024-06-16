import { Action, ActionPanel, Grid, Icon, Keyboard, Toast, showToast } from "@raycast/api";
import { setMaxListeners } from "events";
import { AbortError } from "node-fetch";
import { useEffect, useRef, useState } from "react";
import { getIMDbUrl, getPosterUrl, getTraktUrl } from "../lib/helper";
import { addSeasonToHistory, getSeasons } from "../services/shows";
import { getTMDBSeasonDetails } from "../services/tmdb";
import { Episodes } from "./episodes";

export const Seasons = ({
  traktId,
  tmdbId,
  slug,
  imdbId,
}: {
  traktId: number;
  tmdbId: number;
  slug: string;
  imdbId: string;
}) => {
  const abortable = useRef<AbortController>();
  const [seasons, setSeasons] = useState<TraktSeasonList | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      abortable.current = new AbortController();
      setMaxListeners(20, abortable.current?.signal);
      setIsLoading(true);
      try {
        const seasons = await getSeasons(traktId, abortable.current?.signal);
        setSeasons(seasons);

        const showsWithImages = (await Promise.all(
          seasons.map(async (season) => {
            season.details = await getTMDBSeasonDetails(tmdbId, season.number, abortable.current?.signal);
            return season;
          }),
        )) as TraktSeasonList;

        setSeasons(showsWithImages);
      } catch (e) {
        if (!(e instanceof AbortError)) {
          showToast({
            title: "Error getting seasons",
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
  }, []);

  const onAddSeasonToHistory = async (seasonId: number) => {
    setIsLoading(true);
    try {
      await addSeasonToHistory(seasonId, abortable.current?.signal);
      showToast({
        title: "Season added to history",
        style: Toast.Style.Success,
      });
    } catch (e) {
      if (!(e instanceof AbortError)) {
        showToast({
          title: "Error adding season to history",
          style: Toast.Style.Failure,
        });
      }
    }
    setIsLoading(false);
  };

  return (
    <Grid isLoading={isLoading} aspectRatio="9/16" fit={Grid.Fit.Fill} searchBarPlaceholder="Search for seasons">
      {seasons &&
        seasons.map((season) => {
          return (
            <Grid.Item
              key={season.ids.trakt}
              title={season.title}
              subtitle={new Date(season.first_aired).getFullYear().toString()}
              content={getPosterUrl(season.details?.poster_path, "poster.png")}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.OpenInBrowser title="Open in Trakt" url={getTraktUrl("season", slug, season.number)} />
                    <Action.OpenInBrowser title="Open in IMDb" url={getIMDbUrl(imdbId, season.number)} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.Push
                      icon={Icon.Switch}
                      title="Episodes"
                      shortcut={Keyboard.Shortcut.Common.Open}
                      target={<Episodes traktId={traktId} tmdbId={tmdbId} seasonNumber={season.number} slug={slug} />}
                    />
                    <Action
                      icon={Icon.Clock}
                      title="Add to History"
                      shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
                      onAction={() => onAddSeasonToHistory(season.ids.trakt)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
    </Grid>
  );
};
