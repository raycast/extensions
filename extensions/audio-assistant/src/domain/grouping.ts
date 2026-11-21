import type { Player } from "./model";
import { AudioAssistantError, requirePlayer } from "./policy";

export function groupLeader(players: Player[], activeId?: string): Player {
  const active = requirePlayer(players, activeId);
  if (!active.capabilities.grouping)
    throw new AudioAssistantError("unsupported", "Current output does not support synced group playback.");
  if (active.activeGroupId && active.activeGroupId !== active.id) {
    const group = players.find((player) => player.id === active.activeGroupId && player.playerType === "group");
    if (!group) throw new AudioAssistantError("unsupported", "Select the current group output to manage its members.");
    requirePlayer(players, group.id);
    if (!group.capabilities.grouping)
      throw new AudioAssistantError("unsupported", "Current group does not support membership changes.");
    return group;
  }
  if (active.groupLeaderId && active.groupLeaderId !== active.id)
    throw new AudioAssistantError(
      "unsupported",
      "This output is a synced follower. Select its primary player to manage the group.",
    );
  return active;
}

export function isGroupMember(leader: Player, member: Player): boolean {
  return (
    leader.groupMemberIds.includes(member.id) ||
    member.groupLeaderId === leader.id ||
    member.activeGroupId === leader.id
  );
}

export function groupCandidates(players: Player[], leader: Player): Player[] {
  return players.filter(
    (player) =>
      player.available &&
      player.id !== leader.id &&
      player.playerType === "player" &&
      (leader.canGroupWith?.includes(player.id) || isGroupMember(leader, player)),
  );
}

export function requireGroupChange(players: Player[], activeId: string, memberId: string, joined: boolean) {
  const leader = groupLeader(players, activeId);
  const member = requirePlayer(players, memberId);
  if (!groupCandidates(players, leader).some((player) => player.id === memberId))
    throw new AudioAssistantError("unsupported", "This player is not compatible with the current output.");
  if (!joined && leader.staticGroupMemberIds?.includes(memberId))
    throw new AudioAssistantError(
      "unsupported",
      "This is a permanent group member. Change it in Music Assistant settings.",
    );
  return { leader, member, unchanged: isGroupMember(leader, member) === joined };
}
