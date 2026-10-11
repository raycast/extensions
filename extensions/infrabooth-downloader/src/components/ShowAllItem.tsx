import { Action, ActionPanel, Icon, List } from "@raycast/api";
import type { ReactNode } from "react";
import { ONLINE_KIND_TITLES, type OnlineKind } from "../lib/onlineSearch";
import { ShowAllPlaylists } from "./ShowAllPlaylists";
import { ShowAllTracks } from "./ShowAllTracks";

interface ShowAllItemProps {
  kind: OnlineKind;
  query: string;
  extraActions?: ReactNode;
}

export function ShowAllItem({ kind, query, extraActions }: ShowAllItemProps) {
  const title = `Show All ${ONLINE_KIND_TITLES[kind]}`;
  const target = kind === "tracks" ? <ShowAllTracks query={query} /> : <ShowAllPlaylists kind={kind} query={query} />;
  return (
    <List.Item
      id={`show-all:${kind}`}
      title={title}
      icon={Icon.ArrowRight}
      actions={
        <ActionPanel>
          <Action.Push title={title} icon={Icon.ArrowRight} target={target} />
          {extraActions && <ActionPanel.Section>{extraActions}</ActionPanel.Section>}
        </ActionPanel>
      }
    />
  );
}
