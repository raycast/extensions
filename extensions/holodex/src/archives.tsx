import { ActionPanel, Image, List } from "@raycast/api";
import { formatDistanceToNow, parseISO } from "date-fns";
import { useCallback, useState } from "react";
import { Actions } from "./components/Actions";
import { DetailView } from "./components/Details";
import { apiRequest, useQuery } from "./lib/api";
import { Archive, Video } from "./lib/interfaces";
import { getPreferences, OrgDropdown } from "./lib/preferences";

export default function Command() {
  const { org: defaultOrg } = getPreferences();
  const [org, setOrg] = useState<string>(defaultOrg);

  const { isLoading, results, search } = useSearch(org);

  function orgSelected(org: string) {
    setOrg(org);
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search videos..."
      throttle
      searchBarAccessory={<OrgDropdown defaultOrg={org} onChange={orgSelected} />}
      isShowingDetail
    >
      <List.Section title="Archives" subtitle={String(results.length)}>
        {results.map((searchResult) => (
          <Item key={searchResult.videoId} video={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function Item({ video }: { video: Video }) {
  const parts = [];

  if (video.startAt) {
    parts.push(formatDistanceToNow(video.startAt));
  }

  return (
    <List.Item
      title={video.channelName}
      accessoryTitle={video.topic?.split("_").join(" ") ?? ""}
      icon={{ source: video.avatarUrl, mask: Image.Mask.Circle }}
      detail={<DetailView {...video} />}
      actions={
        <ActionPanel title={`${video.title}`}>
          <Actions video={video} isInDetail={true} />
        </ActionPanel>
      }
    />
  );
}

function useSearch(org: string) {
  const [query, setQuery] = useState<string>();

  const { isLoading, data } = useQuery((signal) => performSearch(signal, org, query), [org, query]);

  const search = useCallback((query: string) => {
    setQuery(query);
  }, []);

  return {
    isLoading,
    search,
    results: data || [],
  };
}

async function performSearch(signal: AbortSignal, org: string, query?: string): Promise<Video[]> {
  const { preferEnglishName } = getPreferences();
  const { language } = getPreferences();

  const languageList = language.split(",").map((ln) => ln.trim());

  const emptyQuery = !query || query.length === 0;

  const response = (
    emptyQuery
      ? await apiRequest("videos", {
          params: {
            type: "stream",
            include: ["description", "clips"],
            status: ["new", "past"],
            limit: 50,
            org,
            lang: languageList,
          },
          signal,
        })
      : await apiRequest("search/videoSearch", {
          body: {
            target: ["stream"],
            status: ["new", "past"],
            limit: 50,
            org: org === "All Vtubers" ? [] : [org],
            conditions: [{ text: query }],
            lang: languageList,
          },
          signal,
        })
  ) as Archive[];

  return response
    .filter((video) => !["missing", "live"].includes(video.status))
    .map((video): Video => {
      const channelName = (preferEnglishName && video.channel.english_name) || video.channel.name;

      return {
        videoId: video.id,
        title: video.title,
        startAt: parseISO(video.available_at ?? video.published_at),
        topic: video.topic_id,
        description: video.description,
        status: video.status,
        channelId: video.channel.id,
        channelName,
        avatarUrl: video.channel.photo,
        liveViewers: 0,
        clips: video.clips?.map((clip) => {
          const channelName = (preferEnglishName && clip.channel.english_name) || clip.channel.name;

          return {
            videoId: clip.id,
            title: clip.title,
            startAt: parseISO(clip.available_at ?? clip.published_at),
            description: clip.description,
            status: clip.status,
            channelId: clip.channel.id,
            channelName,
            avatarUrl: clip.channel.photo,
            liveViewers: 0,
          };
        }),
      };
    });
}
