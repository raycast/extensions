import { Detail, ActionPanel } from "@raycast/api";
import { Episode, EpisodeDetails, MediaDetails } from "../types";
import { EpisodeMetadata } from "./EpisodeMetadata";
import MediaActions from "./MediaActions";
import { useState, useEffect } from "react";
import { ProviderActions } from "./ProviderActions";
import { StreamingProvider } from "../types";
import { getFilteredProviders, searchID } from "../utils/requests";
import { showFailureToast } from "@raycast/utils";

interface EpisodeOverviewProps {
  media: MediaDetails;
  episode: Episode;
}

export default function EpisodeOverview({ media, episode }: EpisodeOverviewProps) {
  const [providers, setProviders] = useState<StreamingProvider[]>([]);
  const [episodeDetails, setEpisodeDetails] = useState<EpisodeDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEpisodeDetails = async () => {
      try {
        const episodeDetails = await searchID(episode.imdbID);
        setEpisodeDetails(episodeDetails);
      } catch (error) {
        showFailureToast(error, { title: "Failed to fetch episode details" });
      } finally {
        setIsLoading(false);
      }
    };
    const fetchProviders = async () => {
      try {
        const providers = await getFilteredProviders(media.imdbID);
        setProviders(providers);
      } catch (error) {
        showFailureToast(error, { title: "Failed to fetch providers" });
      }
    };
    fetchEpisodeDetails();
    fetchProviders();
  }, [media.imdbID, episode.imdbID]);

  const markdown = `
<img src="${episodeDetails?.Poster || media.Poster}" height="200"/>

## Plot
${episodeDetails?.Plot || "No plot available"}


## Additional Series Information
- Episode: ${episode.Episode}
- Season: ${episodeDetails?.Season || "N/A"}
- Airdate: ${episodeDetails?.Released || "N/A"}
`;

  return (
    <Detail
      markdown={markdown}
      metadata={<EpisodeMetadata episode={episode} media={media} providers={providers} />}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <MediaActions media={media} episode={episode} component="Overview" />
          <ProviderActions providers={providers} />
        </ActionPanel>
      }
    />
  );
}
