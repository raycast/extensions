import { ActionPanel, Icon, Image, List } from "@raycast/api";
import { formatDistanceToNow, parseISO } from "date-fns";
import numeral from "numeral";
import { useState } from "react";
import { Actions } from "./components/Actions";
import { VideoDetail } from "./components/Details";
import { apiRequest, useQuery } from "./lib/api";
import { HLive, Video } from "./lib/interfaces";
import { getPreferences, OrgDropdown } from "./lib/preferences";

export default function Command() {
  const { org: defaultOrg } = getPreferences();
  const [org, setOrg] = useState<string>(defaultOrg);

  const { isLoading, results } = useSearch(org);

  function orgSelected(org: string) {
    setOrg(org);
  }

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={<OrgDropdown defaultOrg={org} onChange={orgSelected} />}
      isShowingDetail
    >
      <List.Section title="Live Streams" subtitle={String(results.length)}>
        {results.map((video) => (
          <Item key={video.videoId} video={video} />
        ))}
      </List.Section>
    </List>
  );
}

function Item({ video }: { video: Video }) {
  let icon = Icon.Circle;
  let text: string | null = null;
  let tooltip: string | null = null;

  if (video.status === "upcoming" && video.startAt) {
    text = formatDistanceToNow(video.startAt, { addSuffix: true });
    icon = Icon.Clock;
    tooltip = video.startAt.toLocaleString();
  } else if (video.status === "live" && video.liveViewers) {
    text = numeral(video.liveViewers).format("0a");
    icon = Icon.Binoculars;
    tooltip = video.liveViewers.toString();
  } else if (video.topic === "membersonly") {
    text = "Mengen";
    icon = Icon.Star;
  }

  const keywords = video.title.replace(/[【】?]/g, " ").split(/\s+/);

  return (
    <List.Item
      title={video.channelName}
      accessories={[{ text, icon, tooltip }]}
      keywords={keywords}
      icon={video.avatarUrl ? { source: video.avatarUrl, mask: Image.Mask.Circle } : Icon.Person}
      detail={<VideoDetail {...video} />}
      actions={
        <ActionPanel title={video.title}>
          <Actions video={video} />
        </ActionPanel>
      }
    />
  );
}

function useSearch(org: string) {
  const { isLoading, data } = useQuery((signal) => performLiveVideoSearch(signal, org), [org]);

  return {
    isLoading,
    results: data || [],
  };
}

async function performLiveVideoSearch(signal: AbortSignal, org: string): Promise<Video[]> {
  const { preferEnglishName } = getPreferences();

  const response = (await apiRequest("live", {
    params: {
      org,
      limit: 100,
      type: "stream",
      max_upcoming_hours: 2,
      include: "description",
    },
    signal,
  })) as HLive[];

  return response
    .map((video): Video => {
      const channelName = (preferEnglishName && video.channel.english_name) || video.channel.name;

      return {
        videoId: video.id,
        channelId: video.channel.id,
        channelName,
        title: video.title,
        description: video.description,
        startAt: parseISO(video.start_actual ?? video.start_scheduled),
        topic: video.topic_id,
        liveViewers: video.live_viewers ?? 0,
        avatarUrl: video.channel.photo,
        status: video.status,
        mentions: [],
        clips: [],
      };
    })
    .sort((a, b) => b.liveViewers - a.liveViewers);
}
