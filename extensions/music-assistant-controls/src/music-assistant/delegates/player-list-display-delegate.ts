import { Player } from "../external-code/interfaces";
import { getGroupStatus, isGroupLeader } from "./player-grouping-delegate";
import { getCurrentlyPlayingSong } from "./menu-display-delegate";

export function getPlayerListTitle(player: Player, options?: { isMember?: boolean }): string {
  return options?.isMember ? `    ${player.display_name}` : player.display_name;
}

export function getPlayerListSubtitle(player: Player, options?: { isMember?: boolean }): string {
  if (options?.isMember) {
    const volume = player.volume_level ?? 0;
    return `Group member · Volume: ${volume}%`;
  }

  const nowPlaying = getCurrentlyPlayingSong(player);
  if (nowPlaying) {
    return nowPlaying;
  }

  const status = getGroupStatus(player);
  if (status === "Leader") {
    return `Group leader · ${player.group_childs.length} member(s)`;
  }
  return "Standalone";
}

export function getPlayerAlbumArtUrl(player?: Player): string | undefined {
  if (!player?.current_media?.image_url) return undefined;
  return player.current_media.image_url;
}

export function splitPlayersByGroupRole(players: Player[] | undefined): {
  groupLeaders: Player[];
  standalonePlayers: Player[];
} {
  const allPlayers = players ?? [];
  return {
    groupLeaders: allPlayers.filter((p) => isGroupLeader(p)),
    standalonePlayers: allPlayers.filter((p) => getGroupStatus(p) === "Standalone"),
  };
}
