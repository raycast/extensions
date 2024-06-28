import { Grid, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useRef } from "react";
import { getSeasons } from "../api/shows";
import { SeasonGridItem } from "./season-grid-item";

export const SeasonGrid = ({
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
  const abortable = useRef<AbortController>();
  const { isLoading, data: seasons } = useCachedPromise(
    async (showId: number) => {
      const seasons = await getSeasons(showId, abortable.current?.signal);
      return seasons;
    },
    [showId],
    {
      initialData: undefined,
      keepPreviousData: true,
      abortable,
      onError(error) {
        showToast({
          title: error.message,
          style: Toast.Style.Failure,
        });
      },
    },
  );

  return (
    <Grid isLoading={isLoading} aspectRatio="9/16" fit={Grid.Fit.Fill} searchBarPlaceholder="Search for seasons">
      {seasons &&
        seasons.map((season) => (
          <SeasonGridItem
            key={season.ids.trakt}
            season={season}
            tmdbId={tmdbId}
            slug={slug}
            imdbId={imdbId}
            showId={showId}
          />
        ))}
    </Grid>
  );
};
