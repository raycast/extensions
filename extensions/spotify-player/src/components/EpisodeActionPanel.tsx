import { ActionPanel } from "@raycast/api";
import { SimplifiedEpisodeObject } from "../helpers/spotify.api";
import { AddToQueueAction } from "./AddtoQueueAction";
import { FooterAction } from "./FooterAction";
import { PlayAction } from "./PlayAction";
import { RefreshAction } from "./RefreshAction";

type EpisodeActionPanelProps = {
  title: string;
  episode: SimplifiedEpisodeObject;
  onRefresh?: () => void;
};

export function EpisodeActionPanel({ title, episode, onRefresh }: EpisodeActionPanelProps) {
  return (
    <ActionPanel>
      <PlayAction id={episode.id as string} type="episode" />
      <AddToQueueAction uri={episode.uri} title={title} />
      {onRefresh && <RefreshAction onRefresh={onRefresh} />}
      <FooterAction url={episode?.external_urls?.spotify} uri={episode.uri} title={title} />
    </ActionPanel>
  );
}
