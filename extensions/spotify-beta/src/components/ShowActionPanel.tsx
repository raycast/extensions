import { Action, ActionPanel, Icon, showHUD } from "@raycast/api";
import { play } from "../api/play";
import { SimplifiedShowObject } from "../helpers/spotify.api";
import { EpisodesList } from "./EpisodesList";
import { FooterAction } from "./FooterAction";

type ShowActionPanelProps = { show: SimplifiedShowObject };

export function ShowActionPanel({ show }: ShowActionPanelProps) {
  const title = show.name;

  return (
    <ActionPanel>
      <Action
        title="Play"
        icon={Icon.Play}
        onAction={async () => {
          await play({ id: show.id, type: "show" });
          showHUD(`Playing ${title}`);
        }}
      />
      <Action.Push
        icon={Icon.AppWindowList}
        title="Show Episodes"
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        target={<EpisodesList show={show} />}
      />
      <FooterAction url={show?.external_urls?.spotify} uri={show.uri} title={title} />
    </ActionPanel>
  );
}
