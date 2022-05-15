import { ActionPanel, Icon, Image, List } from "@raycast/api";
import { formatDistanceToNow, parseISO } from "date-fns";
import numeral from "numeral";
import { useState } from "react";
import { Actions } from "./components/Actions";
import { DetailView } from "./components/Details";
import { apiRequest, useQuery } from "./lib/api";
import { Live, Video } from "./lib/interfaces";
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
  let label = "";

  if (video.status === "upcoming" && video.startAt) {
    label = formatDistanceToNow(video.startAt, { addSuffix: true });
    icon = Icon.Clock;
  } else if (video.status === "live" && video.liveViewers) {
    label = numeral(video.liveViewers).format("0a");
    icon = Icon.Binoculars;
  } else if (video.topic === "membersonly") {
    label = "Mengen";
    icon = Icon.Star;
  }

  const keywords = video.title.replace(/[【】?]/g, " ").split(/\s+/);

  return (
    <List.Item
      title={video.channelName}
      accessoryTitle={label}
      accessoryIcon={icon}
      keywords={keywords}
      icon={video.avatarUrl ? { source: video.avatarUrl, mask: Image.Mask.Circle } : Icon.Person}
      detail={<DetailView {...video} />}
      actions={
        <ActionPanel title={video.title}>
          <Actions isInDetail={true} video={video} />
        </ActionPanel>
      }
    />
  );
}

function useSearch(org: string) {
  const { isLoading, data } = useQuery((signal) => performLiveVideoSearch(signal, org), [org]);

  // console.log("useSearch", org, isLoading, data?.length);

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
  })) as Live[];

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
      };
    })
    .sort((a, b) => b.liveViewers - a.liveViewers);
}
