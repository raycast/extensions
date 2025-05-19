import { Detail, ActionPanel } from "@raycast/api";
import { Episode, EpisodeDetails, MediaDetails } from "../types";
import { EpisodeMetadata } from "./EpisodeMetadata";
import MediaActions from "./MediaActions";
import { useState, useEffect } from "react";
import { ProviderActions } from "./ProviderActions";
import { StreamingProviders } from "../types";
import { getFilteredProviders, searchID } from "../utils/requests";

interface EpisodeOverviewProps {
  media: MediaDetails;
  episode: Episode;
}

export default function EpisodeOverview({ media, episode }: EpisodeOverviewProps) {
  const [providers, setProviders] = useState<StreamingProviders>([]);
  const [episodeDetails, setEpisodeDetails] = useState<EpisodeDetails | null>(null);

  useEffect(() => {
    const fetchEpisodeDetails = async () => {
      const episodeDetails = await searchID(episode.imdbID);
      setEpisodeDetails(episodeDetails);
    };

    const fetchProviders = async () => {
      const providers = await getFilteredProviders(media.imdbID);
      setProviders(providers);
    };
    fetchEpisodeDetails();
    fetchProviders();
  }, [media.imdbID]);

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
      actions={
        <ActionPanel>
          <MediaActions media={media} episode={episode} component="Overview" />
          <ProviderActions providers={providers} />
        </ActionPanel>
      }
    />
  );
}
