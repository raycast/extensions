import { useEffect, useState } from "react";
import { ActionPanel, Detail } from "@raycast/api";
import { AIOverviewProps, StreamingProvider } from "../types";
import { getFilteredProviders } from "../utils/requests";
import { MediaMetadata } from "./MediaMetadata";
import { ProviderActions } from "./ProviderActions";
import MediaActions from "./MediaActions";
import { showFailureToast } from "@raycast/utils";

export default function MediaOverview({ media }: AIOverviewProps) {
  const isMovie = media.Type.toLowerCase() === "movie";
  const [providers, setProviders] = useState<StreamingProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const data = await getFilteredProviders(media.imdbID);
        setProviders(data);
      } catch (error) {
        showFailureToast(error, { title: "Could not fetch providers" });
        setProviders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProviders();
  }, [media.imdbID]);

  const markdown = `
<img src="${media.Poster}" height="200"/>

## Plot
${media.Plot}

${
  isMovie &&
  `
### Awards
${media.Awards}

### Box Office
${media.BoxOffice}
`
}

### Additional Information
- Genre: ${media.Genre}
- Runtime: ${media.Runtime}
- Release Date: ${media.Released}
- Director: ${media.Director}
- Writer: ${media.Writer}
- Language: ${media.Language}
- Country: ${media.Country}
`;

  return (
    <Detail
      markdown={markdown}
      metadata={<MediaMetadata media={media} providers={providers} providersLoading={loading} />}
      actions={
        <ActionPanel>
          <MediaActions media={media} component="MediaOverview" />
          <ProviderActions providers={providers} />
        </ActionPanel>
      }
    />
  );
}
