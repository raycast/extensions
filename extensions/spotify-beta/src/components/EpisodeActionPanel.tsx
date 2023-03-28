import { Action, ActionPanel, Icon, showHUD } from "@raycast/api";
import { play } from "../api/play";
import { SimplifiedEpisodeObject } from "../helpers/spotify.api";
import { AddToQueueAction } from "./AddtoQueueAction";
import { FooterAction } from "./FooterAction";

type EpisodeActionPanelProps = {
  title: string;
  episode: SimplifiedEpisodeObject;
};

export function EpisodeActionPanel({ title, episode }: EpisodeActionPanelProps) {
  return (
    <ActionPanel>
      <Action
        icon={Icon.Play}
        title="Play"
        onAction={async () => {
          await play({ id: episode.id, type: "episode" });
          showHUD(`Playing ${title}`);
        }}
      />
      <AddToQueueAction uri={episode.uri} title={title} />
      <FooterAction url={episode?.external_urls?.spotify} uri={episode.uri} title={title} />
    </ActionPanel>
  );
}
