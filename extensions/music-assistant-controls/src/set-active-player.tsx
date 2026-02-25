import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import MusicAssistantClient from "./music-assistant-client";
import { useCachedPromise } from "@raycast/utils";
import { Player } from "./external-code/interfaces";

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

  const select = async (player_id: string, display_name: string) => {
    await client.selectPlayer(player_id, display_name);
  };

  const getIcon = (player: Player): Icon | Image.ImageLike => {
    const albumArt = client.getPlayerAlbumArt(player);
    if (albumArt) {
      return { source: albumArt, mask: Image.Mask.RoundedRectangle };
    }

    const status = client.getGroupStatus(player);
    return status === "Standalone" ? Icon.Cd : Icon.TwoPeople;
  };

  const getSubtitle = (player: Player): string => {
    const nowPlaying = client.getCurrentlyPlayingSong(player);
    if (nowPlaying) return nowPlaying;

    const status = client.getGroupStatus(player);
    if (status === "Leader") {
      return `Group leader · ${player.group_childs.length} member(s)`;
    }
    return "Standalone";
  };

  // Filter to only show standalone players and group leaders (not members)
  const groupLeaders = players?.filter((p) => client.isGroupLeader(p)) || [];
  const standalonePlayers = players?.filter((p) => client.getGroupStatus(p) === "Standalone") || [];

  return (
    <List isLoading={isLoading} navigationTitle="Set Active Player" searchBarPlaceholder="Search your players">
      {/* Groups section */}
      {groupLeaders.length > 0 && (
        <List.Section title="Groups" subtitle={`${groupLeaders.length} group(s)`}>
          {groupLeaders.map((player) => (
            <List.Item
              key={player.player_id}
              title={player.display_name}
              subtitle={getSubtitle(player)}
              icon={getIcon(player)}
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
              subtitle={getSubtitle(player)}
              icon={getIcon(player)}
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
