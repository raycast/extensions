import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { PlayersQuery } from "../../__generated__/graphql";
import { useMutation } from "@apollo/client";
import { client, setPlayerMuteMutation, setPlayerPauseStateMutation, syncPlayersMutation } from "../graphql";
import { useState } from "react";

export function PlayerListItem({ player }: { player: PlayersQuery["players"][0] }) {
  const [setRemotePlayerPauseState, { data }] = useMutation(setPlayerPauseStateMutation, { client });
  const [setRemotePlayerMute] = useMutation(setPlayerMuteMutation, { client });
  const [syncPlayers] = useMutation(syncPlayersMutation, { client });

  const [playerState, setPlayerState] = useState({
    muted: player.state?.muted,
    isPlaying: data?.playerSetPaused ?? player.state?.paused ?? false,
  });

  let title: string = "Unknown";
  if (player.driverData) {
    title = `${player.driverData.firstName} ${player.driverData.lastName} - ${player.driverData.teamName}`;
  } else if (player.streamData?.title) {
    title = player.streamData.title;
  }

  const accessories: List.Item.Accessory[] = [];
  if (player.driverData?.tla) {
    accessories.push({ tag: player.driverData.tla, icon: Icon.Person });
  }

  return (
    <List.Item
      id={player.id}
      title={title}
      subtitle={playerState.muted ? "Muted" : playerState.isPlaying ? "Paused" : "Playing"}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title={player.state?.muted ? "Unmute" : "Mute"}
            onAction={async () => {
              setPlayerState((prev) => ({ ...prev, muted: !prev.muted }));
              await setRemotePlayerMute({
                variables: {
                  playerSetMutedId: player.id,
                },
              });
            }}
          />
          <Action
            title={playerState.isPlaying ? "Play" : "Pause"}
            onAction={async () => {
              setPlayerState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
              await setRemotePlayerPauseState({
                variables: {
                  playerSetPausedId: player.id,
                  paused: !playerState.isPlaying,
                },
              });
            }}
          />
          <Action
            title="Sync to This Player"
            onAction={() =>
              syncPlayers({
                variables: {
                  playerSyncId: player.id,
                },
              })
            }
          />
        </ActionPanel>
      }
    />
  );
}
