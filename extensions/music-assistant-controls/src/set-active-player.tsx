import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import MusicAssistantClient from "./music-assistant/music-assistant-client";
import { useCachedPromise } from "@raycast/utils";
import { Player } from "./music-assistant/external-code/interfaces";
import {
  getPlayerListSubtitle,
  splitPlayersByGroupRole,
} from "./music-assistant/delegates/player-list-display-delegate";

export default function SetActivePlayerCommand() {
  const client = new MusicAssistantClient();
  const {
    isLoading,
    data: players,
    revalidate: revalidatePlayers,
  } = useCachedPromise(async () => await client.getPlayers(), [], {
    keepPreviousData: true,
    initialData: [],
  });

  const getPlayerListIcon = (player: Player, options?: { isMember?: boolean }): Icon | Image.ImageLike => {
    if (options?.isMember) {
      return Icon.Dot;
    }

    const albumArtUrl = client.getPlayerAlbumArt(player);
    if (albumArtUrl) {
      return { source: albumArtUrl, mask: Image.Mask.RoundedRectangle };
    }

    const status = client.getGroupStatus(player);
    return status === "Standalone" ? Icon.Cd : Icon.TwoPeople;
  };

  const select = async (player_id: string, display_name: string) => {
    await client.selectPlayer(player_id, display_name);
  };

  const { groupLeaders, standalonePlayers } = splitPlayersByGroupRole(players);

  return (
    <List isLoading={isLoading} navigationTitle="Set Active Player" searchBarPlaceholder="Search your players">
      {/* Groups section */}
      {groupLeaders.length > 0 && (
        <List.Section title="Groups" subtitle={`${groupLeaders.length} group(s)`}>
          {groupLeaders.map((player) => (
            <List.Item
              key={player.player_id}
              title={player.display_name}
              subtitle={getPlayerListSubtitle(player)}
              icon={getPlayerListIcon(player)}
              actions={
                <ActionPanel>
                  <Action title="Select" onAction={() => select(player.player_id, player.display_name)} />
                  <Action title="Reload" onAction={() => revalidatePlayers()} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Standalone Players section */}
      {standalonePlayers.length > 0 && (
        <List.Section title="Standalone Players" subtitle={`${standalonePlayers.length} player(s)`}>
          {standalonePlayers.map((player) => (
            <List.Item
              key={player.player_id}
              title={player.display_name}
              subtitle={getPlayerListSubtitle(player)}
              icon={getPlayerListIcon(player)}
              actions={
                <ActionPanel>
                  <Action title="Select" onAction={() => select(player.player_id, player.display_name)} />
                  <Action title="Reload" onAction={() => revalidatePlayers()} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
