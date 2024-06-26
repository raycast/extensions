import { Action, ActionPanel, Grid, Icon, Keyboard, Toast, showToast } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useEffect } from "react";
import { useSeasonDetails } from "../hooks/useSeasonDetails";
import { useSeasons } from "../hooks/useSeasons";
import { getIMDbUrl, getPosterUrl, getTraktUrl } from "../lib/helper";
import { Episodes } from "./episodes";

export const Seasons = ({
  showId,
  tmdbId,
  slug,
  imdbId,
}: {
  showId: number;
  tmdbId: number;
  slug: string;
  imdbId: string;
}) => {
  const { seasons, error } = useSeasons(showId);
  const { details: seasonDetails, error: detailsError } = useSeasonDetails(tmdbId, seasons);

  useEffect(() => {
    if (error) {
      showToast({
        title: error.message,
        style: Toast.Style.Failure,
      });
    }
  }, [error]);

  useEffect(() => {
    if (detailsError) {
      showToast({
        title: detailsError.message,
        style: Toast.Style.Failure,
      });
    }
  }, [detailsError]);

  const isLoading = !seasons || !seasonDetails.size || !!error || !!detailsError;

  return (
    <Grid isLoading={isLoading} aspectRatio="9/16" fit={Grid.Fit.Fill} searchBarPlaceholder="Search for seasons">
      {seasons &&
        seasons.map((season) => {
          const details = seasonDetails.get(season.ids.trakt);

          return (
            <Grid.Item
              key={season.ids.trakt}
              title={season.title}
              subtitle={season.first_aired ? new Date(season.first_aired).getFullYear().toString() : "Not Aired"}
              content={getPosterUrl(details?.poster_path, "poster.png")}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.OpenInBrowser
                      icon={getFavicon("https://trakt.tv")}
                      title="Open in Trakt"
                      url={getTraktUrl("season", slug, season.number)}
                    />
                    <Action.OpenInBrowser
                      icon={getFavicon("https://www.imdb.com")}
                      title="Open in IMDb"
                      url={getIMDbUrl(imdbId, season.number)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.Push
                      icon={Icon.Switch}
                      title="Episodes"
                      shortcut={Keyboard.Shortcut.Common.Open}
                      target={<Episodes showId={showId} tmdbId={tmdbId} seasonNumber={season.number} slug={slug} />}
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
