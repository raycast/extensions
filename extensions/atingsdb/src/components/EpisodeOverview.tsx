import { Detail, ActionPanel } from "@raycast/api";
import { Episode, MediaDetails } from "../types";
import { EpisodeMetadata } from "./EpisodeMetadata";
import MediaActions from "./MediaActions";
import { useState, useEffect } from "react";
import { getUSProviders } from "../utils/requests";
import { ProviderActions } from "./ProviderActions";
import { StreamingProviders } from "../types";

interface EpisodeOverviewProps {
  media: MediaDetails;
  episode: Episode;
}

export default function EpisodeOverview({ media, episode }: EpisodeOverviewProps) {
  const [providers, setProviders] = useState<StreamingProviders>([]);

  useEffect(() => {
    const fetchProviders = async () => {
      const providers = await getUSProviders(media.imdbID);
      setProviders(providers);
    };
    fetchProviders();
  }, [media.imdbID]);

  const markdown = `
<img src="${media.Poster}" height="200"/>

## Plot
${media.Plot}


## Additional Series Information
- Genre: ${media.Genre}
- Runtime: ${media.Runtime}
- Release Date: ${media.Released}
- Language: ${media.Language}
- Country: ${media.Country}
- Awards: ${media.Awards}
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
