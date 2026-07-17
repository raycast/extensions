import { useEffect, useState } from "react";
import { List } from "@raycast/api";
import { EpisodeListProps, Episode } from "../types";
import EpisodeListItem from "./EpisodeListItem";
import { searchSeries } from "../utils/requests";
import { showFailureToast } from "@raycast/utils";

export const EpisodeList = ({ media, totalSeasons }: EpisodeListProps) => {
  const [viewType, setViewType] = useState(`Season 1`);
  const [seasonNumber, setSeasonNumber] = useState(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEpisodes = async () => {
      try {
        setIsLoading(true);
        setSeasonNumber(parseInt(viewType.split(" ")[1]));
        const seasonData = await searchSeries(media.imdbID, seasonNumber);
        if (seasonData?.Episodes) {
          setEpisodes(seasonData.Episodes);
        }
      } catch (error) {
        showFailureToast(error, { title: "Failed to fetch episodes" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchEpisodes();
  }, [viewType, media.imdbID]);

  return (
    <List
      isLoading={isLoading}
      throttle={true}
      searchBarPlaceholder="Search for an episode..."
      searchBarAccessory={
        <List.Dropdown tooltip="View" onChange={(newValue) => setViewType(newValue)}>
          {totalSeasons &&
            Array.from({ length: totalSeasons }, (_, i) => (
              <List.Dropdown.Item key={i} title={`Season ${i + 1}`} value={`Season ${i + 1}`} />
            ))}
        </List.Dropdown>
      }
    >
      {episodes.map((episode) => (
        <EpisodeListItem key={episode.imdbID} episode={episode} media={media} seasonNumber={seasonNumber} />
      ))}
    </List>
  );
};
