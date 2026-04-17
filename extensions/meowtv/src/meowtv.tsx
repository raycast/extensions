import {
  Grid,
  ActionPanel,
  Action,
  Icon,
  Detail,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { search, fetchDetails, fetchStreamUrl } from "./api";
import { ContentItem, MovieDetails, Episode } from "./types";
import { Clipboard } from "@raycast/api";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    async function performSearch() {
      if (!searchText) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const data = await search(searchText);
        setResults(data);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    performSearch();
  }, [searchText]);

  return (
    <Grid
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search movies and TV shows on MeowTV..."
      throttle
      columns={5}
      aspectRatio="2/3"
      fit={Grid.Fit.Fill}
    >
      <Grid.Section title="Results" subtitle={`${results.length}`}>
        {results.map((item) => (
          <Grid.Item
            key={item.id}
            title={item.title}
            subtitle={item.type}
            content={{ source: item.coverImage || Icon.Video }}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Details"
                  target={<MovieDetail id={item.id} title={item.title} />}
                  icon={Icon.Eye}
                />
                {item.type === "movie" ? (
                  <WatchAction id={item.id} />
                ) : (
                  <Action.Push
                    title="Select Episode"
                    target={<EpisodeSelector id={item.id} title={item.title} />}
                    icon={Icon.List}
                  />
                )}
                <Action.CopyToClipboard
                  title="Copy Link"
                  content={`https://meowtv.vercel.app/watch/${item.id}`}
                />
              </ActionPanel>
            }
          />
        ))}
      </Grid.Section>
    </Grid>
  );
}

function MovieDetail({ id, title }: { id: string; title: string }) {
  const [details, setDetails] = useState<MovieDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDetails() {
      try {
        const data = await fetchDetails(id);
        setDetails(data);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load details",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadDetails();
  }, [id]);

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  if (!details) {
    return <Detail markdown={`# Failed to load details for ${title}`} />;
  }

  const isSeries = details.episodes && details.episodes.length > 0;

  const markdown = `
# ${details.title}

${details.coverImage ? `![Cover](${details.coverImage})\n` : ""}

${details.description || "No description available."}

---

**Year:** ${details.year || "N/A"}
**Score:** ${details.score || "N/A"}
**Type:** ${isSeries ? "Series" : "Movie"}

${
  isSeries
    ? `## Episodes (${details.episodes?.length})\n` +
      details.episodes
        ?.slice(0, 10)
        .map((ep) => `- S${ep.season}E${ep.number}: ${ep.title}`)
        .join("\n") +
      (details.episodes && details.episodes.length > 10 ? "\n- ..." : "")
    : ""
}
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={details.title}
      actions={
        <ActionPanel>
          {isSeries ? (
            <Action.Push
              title="Select Episode"
              target={<EpisodeSelector id={id} title={details.title} />}
              icon={Icon.List}
            />
          ) : (
            <WatchAction id={id} />
          )}
          <Action.CopyToClipboard
            title="Copy Page Link"
            content={`https://meowtv.vercel.app/watch/${id}`}
          />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Title" text={details.title} />
          {details.year && (
            <Detail.Metadata.Label
              title="Year"
              text={details.year.toString()}
            />
          )}
          {details.score && (
            <Detail.Metadata.Label
              title="Score"
              text={details.score.toString()}
            />
          )}
          {details.tags && (
            <Detail.Metadata.TagList title="Tags">
              {details.tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
    />
  );
}

function EpisodeSelector({ id, title }: { id: string; title: string }) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadEpisodes() {
      try {
        const details = await fetchDetails(id);
        if (details) {
          setEpisodes(details.episodes || []);
        }
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load episodes",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadEpisodes();
  }, [id]);

  return (
    <Grid
      isLoading={isLoading}
      columns={4}
      aspectRatio="16/9"
      fit={Grid.Fit.Fill}
      navigationTitle={`${title} - Episodes`}
    >
      {episodes.map((ep) => (
        <Grid.Item
          key={`${ep.season}-${ep.number}`}
          title={`S${ep.season} E${ep.number}`}
          subtitle={ep.title}
          content={Icon.Video}
          actions={
            <ActionPanel>
              <WatchAction id={id} episodeId={ep.id} season={ep.season} episode={ep.number} />
              <Action.CopyToClipboard
                title="Copy Link"
                content={`https://meowtv.vercel.app/watch/${id}?s=${ep.season}&e=${ep.number}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}

function WatchAction({
  id,
  episodeId,
  season,
  episode,
}: {
  id: string;
  episodeId?: string;
  season?: number;
  episode?: number;
}) {
  const watchUrl = `https://meowtv.vercel.app/watch/${id}${season ? `?s=${season}${episode ? `&e=${episode}` : ""}` : ""}`;

  return (
    <>
      <Action.OpenInBrowser title="Watch on MeowTV" url={watchUrl} />
      <Action
        title="Copy Direct Video Link"
        icon={Icon.Link}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        onAction={async () => {
          const toast = await showToast({
            style: Toast.Style.Animated,
            title: "Fetching stream URL...",
          });
          try {
            const stream = await fetchStreamUrl(id, episodeId);
            if (stream?.videoUrl) {
              await Clipboard.copy(stream.videoUrl);
              toast.style = Toast.Style.Success;
              toast.title = "Copied to clipboard";
            } else {
              throw new Error("No video URL found");
            }
          } catch (e) {
            toast.style = Toast.Style.Failure;
            toast.title = "Failed to fetch stream URL";
            toast.message = String(e);
          }
        }}
      />
    </>
  );
}
