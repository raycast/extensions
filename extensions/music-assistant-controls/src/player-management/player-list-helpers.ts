import { Icon, Image } from "@raycast/api";
import { Player } from "../music-assistant/external-code/interfaces";
import MusicAssistantClient from "../music-assistant/music-assistant-client";

export function getPlayerListIcon(
  client: MusicAssistantClient,
  player: Player,
  options?: { isMember?: boolean },
): Icon | Image.ImageLike {
  if (options?.isMember) {
    return Icon.Dot;
  }

  const albumArt = client.getPlayerAlbumArt(player);
  if (albumArt) {
    return { source: albumArt, mask: Image.Mask.RoundedRectangle };
  }

  const status = client.getGroupStatus(player);
  return status === "Standalone" ? Icon.Cd : Icon.TwoPeople;
}

export function getPlayerListTitle(player: Player, options?: { isMember?: boolean }): string {
  return options?.isMember ? `    ${player.display_name}` : player.display_name;
}

export function getPlayerListSubtitle(
  client: MusicAssistantClient,
  player: Player,
  options?: { isMember?: boolean },
): string {
  if (options?.isMember) {
    const volume = player.volume_level ?? 0;
    return `Group member · Volume: ${volume}%`;
  }

  const nowPlaying = client.getCurrentlyPlayingSong(player);
  if (nowPlaying) {
    return nowPlaying;
  }

  const status = client.getGroupStatus(player);
  if (status === "Leader") {
    return `Group leader · ${player.group_childs.length} member(s)`;
  }
  return "Standalone";
}

export function splitPlayersByGroupRole(
  client: MusicAssistantClient,
  players: Player[] | undefined,
): { groupLeaders: Player[]; standalonePlayers: Player[] } {
  const allPlayers = players ?? [];
  return {
    groupLeaders: allPlayers.filter((p) => client.isGroupLeader(p)),
    standalonePlayers: allPlayers.filter((p) => client.getGroupStatus(p) === "Standalone"),
  };
}
