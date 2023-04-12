import { Action, ActionPanel, Icon } from "@raycast/api";
import { SimplifiedShowObject } from "../helpers/spotify.api";
import { EpisodesList } from "./EpisodesList";
import { FooterAction } from "./FooterAction";
import { PlayAction } from "./PlayAction";

type ShowActionPanelProps = { show: SimplifiedShowObject };

export function ShowActionPanel({ show }: ShowActionPanelProps) {
  const title = show.name;

  return (
    <ActionPanel>
      <PlayAction id={show.id} type="show" />
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
