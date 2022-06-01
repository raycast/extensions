import { ActionPanel, Image, List } from "@raycast/api";
import { formatDistanceToNow, parseISO } from "date-fns";
import { useCallback, useState } from "react";
import { Actions } from "./components/Actions";
import { DetailView } from "./components/Details";
import { apiRequest, useQuery } from "./lib/api";
import { Clip, Video } from "./lib/interfaces";
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
      <List.Section title="Clips" subtitle={results.length + ""}>
        {results.map((video) => (
          <ClipItem key={video.videoId} video={video} />
        ))}
      </List.Section>
    </List>
  );
}

export function ClipItem({ video }: { video: Video }) {
  const parts = [];

  switch (video.status) {
    case "upcoming":
      parts.push("🔔");
      break;
    case "new":
      parts.push("🆕");
      break;
  }

  if (video.startAt) {
    parts.push(formatDistanceToNow(video.startAt, { addSuffix: true }));
  }

  return (
    <List.Item
      title={video.channelName}
      // accessoryTitle={parts.join(" ")}
      icon={{ source: video.avatarUrl, mask: Image.Mask.Circle }}
      detail={<DetailView {...video} />}
      actions={
        <ActionPanel title={`Clip: ${video.videoId}`}>
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

  const emptyQuery = !query || query.length === 0;

  const { language } = getPreferences();
  const languageList = language.split(",").map((ln) => ln.trim());

  const response = (
    emptyQuery
      ? await apiRequest("videos", {
          params: {
            type: "clip",
            include: ["description", "mentions"],
            limit: 50,
            org,
            lang: languageList,
          },
          signal,
        })
      : await apiRequest("search/videoSearch", {
          body: {
            target: ["clip"],
            limit: 50,
            org: org === "All Vtubers" ? [] : [org],
            conditions: [{ text: query }],
            lang: languageList,
          },
          signal,
        })
  ) as Clip[];

  return response.map((video) => {
    console.log(video);
    const channelName = (preferEnglishName && video.channel.english_name) || video.channel.name;

    return {
      videoId: video.id,
      title: video.title,
      videoType: video.type,
      startAt: parseISO(video.published_at),
      description: video.description,
      status: video.status,
      channelId: video.channel.id,
      channelName,
      avatarUrl: video.channel.photo,
      type: video.type,
      liveViewers: 0,
    };
  });
}
