import React from "react";
import { List, LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { PlayerOnIce } from "./utils/types";
import { userInterface } from "./utils/translations";
import { getLanguageKey } from "./utils/helpers";
import Unresponsive from "./templates/unresponsive";
import PlayerListItem from "./templates/playerListItem";

interface Player {
  data: PlayerOnIce[];
  isLoading: boolean;
}

export default function Command(props: LaunchProps) {
  const { name } = props.arguments;
  const playerType = props.arguments.playerType || "true";

  const { isLoading, data } = useFetch(
    `https://search.d3.nhle.com/api/v1/search/player?culture=en-us&limit=100&q=${name}*&active=${playerType}`,
  ) as Player;

  if (isLoading) return <List isLoading={true} />;

  if (!data) return <Unresponsive />;

  return (
    <List filtering={true} navigationTitle={userInterface.searchPlayers[getLanguageKey()]}>
      {data.map((player) => (
        <PlayerListItem key={player.playerId} player={player} />
      ))}
    </List>
  );
}
