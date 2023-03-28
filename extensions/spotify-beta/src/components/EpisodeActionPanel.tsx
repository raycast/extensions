import { Action, ActionPanel, Icon, showHUD, showToast } from "@raycast/api";
import { addToQueue } from "../api/addTrackToQueue";
import { play } from "../api/play";
import { SimplifiedEpisodeObject } from "../helpers/spotify.api";
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
      <Action
        icon={Icon.Plus}
        title="Add To Queue"
        onAction={async () => {
          await addToQueue({ trackUri: episode.uri as string });
          showToast({ title: "Added to queue", message: title });
        }}
      />
      <FooterAction url={episode?.external_urls?.spotify} uri={episode.uri} title={title} />
    </ActionPanel>
  );
}
