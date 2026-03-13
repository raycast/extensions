import React from "react";
import { useQuery } from "@apollo/client";
import { List } from "@raycast/api";
import { client, getPlayersQuery } from "./lib/graphql";
import { PlayerListItem } from "./lib/components/PlayerListItem";

export default function Command() {
  const { data, loading } = useQuery(getPlayersQuery, { client });

  const players = data?.players ?? [];

  return (
    <List isLoading={loading} throttle>
      <List.Section title="Players" subtitle={players?.length + ""}>
        {players?.map((player) => <PlayerListItem key={player.id} player={player} />)}
      </List.Section>
    </List>
  );
}
