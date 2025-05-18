import { useEffect, useState } from "react";
import { List } from "@raycast/api";
import { EpisodeListProps, Episode } from "../types";
import EpisodeListItem from "./EpisodeListItem";
import { searchSeries } from "../utils/requests";

export const EpisodeList = ({ media, totalSeasons }: EpisodeListProps) => {
  const [viewType, setViewType] = useState("Season 1");
  const [episodes, setEpisodes] = useState<Episode[]>([]);

  useEffect(() => {
    const fetchEpisodes = async () => {
      const seasonNumber = parseInt(viewType.split(" ")[1]);
      const seasonData = await searchSeries(media.imdbID, seasonNumber);
      if (seasonData && seasonData.Episodes) {
        setEpisodes(seasonData.Episodes);
      }
    };

    fetchEpisodes();
  }, [viewType, media.imdbID]);

  return (
    <List
      searchBarAccessory={
        <List.Dropdown tooltip="View" storeValue onChange={(newValue) => setViewType(newValue)}>
          {totalSeasons &&
            Array.from({ length: totalSeasons }, (_, i) => (
              <List.Dropdown.Item key={i} title={`Season ${i + 1}`} value={`Season ${i + 1}`} />
            ))}
        </List.Dropdown>
      }
    >
      {episodes.map((episode) => (
        <EpisodeListItem
          key={episode.imdbID}
          episode={episode}
          media={media}
          seasonNumber={parseInt(viewType.split(" ")[1])}
        />
      ))}
    </List>
  );
};
