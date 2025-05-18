import { useEffect, useState } from "react";
import { Action, ActionPanel, List, Icon } from "@raycast/api";
import { searchSeries } from "../utils/requests";
import { EpisodeListItemProps, MediaDetails } from "../types";
import AIReviewView from "./AIOverview";
import { getIMDBUrl, formatDate } from "../utils";
import EpisodeOverview from "./EpisodeOverview";

const EpisodeListItem = ({ episode, media }: EpisodeListItemProps) => {
  const [episodeDetails, setEpisodeDetails] = useState<MediaDetails | null>(null);

  useEffect(() => {
    const fetchEpisodeDetails = async () => {
      const data = await searchSeries(episode.imdbID);
      setEpisodeDetails(data);
    };
    fetchEpisodeDetails();
  }, [episode.imdbID]);

  if (!episodeDetails) {
    return null;
  }

  return (
    <List.Item
      key={episode.imdbID}
      title={`${episode.Episode}. ${episode.Title}`}
      subtitle={`${formatDate(episode.Released)}`}
      accessories={[
        { text: episode.imdbRating, icon: "imdb.png" },
        ...(episodeDetails.Ratings[1]?.Value
          ? [{ text: episodeDetails.Ratings[1].Value, icon: "rotten-tomatoes-certified.png" }]
          : []),
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            key="media-review"
            title="Episode Overview"
            target={<EpisodeOverview media={media} episode={episode} />}
            icon={Icon.Monitor}
          />
          <Action.OpenInBrowser
            key="imdb-link"
            title="Open on Imdb"
            url={getIMDBUrl(media)}
            icon={{ source: "imdb.png" }}
          />
          <Action.Push
            key="ai-review"
            title="AI Overview"
            target={<AIReviewView media={media} episode={episode} />}
            icon={Icon.Stars}
          />
        </ActionPanel>
      }
    />
  );
};

export default EpisodeListItem;
