import { Action, ActionPanel, Icon } from "@raycast/api";
import { SimplifiedShowObject } from "../helpers/spotify.api";
import { EpisodesList } from "./EpisodesList";
import { FooterAction } from "./FooterAction";
import { PlayAction } from "./PlayAction";
import { ShowContent } from "../shortcuts/shortcuts";

type ShowActionPanelProps = { show?: SimplifiedShowObject | null };

export function ShowActionPanel({ show }: ShowActionPanelProps) {
  if (!show?.id) return null;

  const title = show.name;

  return (
    <ActionPanel>
      <PlayAction id={show.id} type="show" />
      <Action.Push
        icon={Icon.AppWindowList}
        title="Show Episodes"
        shortcut={ShowContent}
        target={<EpisodesList show={show} />}
      />
      <FooterAction url={show?.external_urls?.spotify} uri={show.uri} title={title} />
    </ActionPanel>
  );
}
