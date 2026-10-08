import { Player } from "../external-code/interfaces";

export function getGroupMembers(player: Player, allPlayers: Player[]): Player[] {
  if (!player.group_childs || player.group_childs.length === 0) {
    return [];
  }

  return player.group_childs
    .map((childId) => allPlayers.find((p) => p.player_id === childId))
    .filter((p): p is Player => p !== undefined);
}

export function formatSelectionMessage(displayName: string): string {
  const isMacOS = process.platform === "darwin";
  if (isMacOS) {
    return `${displayName} selected, allow 10 seconds for the menubar to update!`;
  }
  return `${displayName} selected!`;
}

export function supportsVolumeControl(player?: Player): boolean {
  return player?.volume_control !== "none" && player?.volume_control !== undefined;
}

export function supportsMuteControl(player?: Player): boolean {
  return player?.mute_control !== "none" && player?.mute_control !== undefined;
}

export function getVolumeDisplay(player?: Player): string {
  if (!player || !supportsVolumeControl(player)) {
    return "Volume: N/A";
  }

  const level = player.volume_level ?? 0;
  const muteStatus = player.volume_muted ? " (Muted)" : "";
  return `Volume: ${level}%${muteStatus}`;
}

export function getVolumeOptions(): Array<{ level: number; display: string }> {
  return [
    { level: 0, display: "Mute" },
    { level: 25, display: "25%" },
    { level: 50, display: "50%" },
    { level: 75, display: "75%" },
    { level: 100, display: "100%" },
  ];
}

export function canFormGroup(player?: Player): boolean {
  if (!player) return false;
  return player.can_group_with.length > 0;
}

export function isGroupLeader(player?: Player): boolean {
  if (!player) return false;
  return player.group_childs.length > 0;
}

export function getGroupStatus(player?: Player): "Leader" | "Member" | "Standalone" {
  if (!player) return "Standalone";

  if (isGroupLeader(player)) {
    return "Leader";
  }

  if (player.synced_to || player.active_group) {
    return "Member";
  }

  return "Standalone";
}

export function getCompatiblePlayers(targetPlayer: Player, allPlayers: Player[]): Player[] {
  return allPlayers.filter(
    (p) =>
      p.player_id !== targetPlayer.player_id &&
      p.available &&
      p.enabled &&
      targetPlayer.can_group_with.some((provider) => p.can_group_with.includes(provider)),
  );
}

export function getGroupMemberOptions(
  targetPlayer: Player,
  allPlayers: Player[],
): { currentMembers: Player[]; potentialMembers: Player[] } {
  const currentMembers = getGroupMembers(targetPlayer, allPlayers).filter(
    (member) => member.player_id !== targetPlayer.player_id,
  );
  const compatiblePlayers = getCompatiblePlayers(targetPlayer, allPlayers);
  const potentialMembers = compatiblePlayers.filter(
    (player) => !currentMembers.some((member) => member.player_id === player.player_id),
  );

  return { currentMembers, potentialMembers };
}
