import { useEffect, useState } from "react";
import { ActionPanel, Detail } from "@raycast/api";
import { AIOverviewProps, StreamingProviders } from "../types";
import { getUSProviders } from "../utils/requests";
import { MediaMetadata } from "./MediaMetadata";
import { ProviderActions } from "./ProviderActions";
import MediaActions from "./MediaActions";

export default function MediaOverview({ media }: AIOverviewProps) {
  const isMovie = media.Type.toLowerCase() === "movie";

  const [providers, setProviders] = useState<StreamingProviders>([]);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const data = await getUSProviders(media.imdbID);
        setProviders(data);
      } catch (error) {
        console.error("Error fetching providers:", error);
        setProviders([]);
      } finally {
        setProviders([]);
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
      metadata={<MediaMetadata media={media} providers={providers} />}
      actions={
        <ActionPanel>
          <MediaActions media={media} component="MediaOverview" />
          <ProviderActions providers={providers} />
        </ActionPanel>
      }
    />
  );
}
