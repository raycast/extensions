import { Action, ActionPanel, Icon, Image, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Player } from "./music-assistant/external-code/interfaces";
import MusicAssistantClient from "./music-assistant/music-assistant-client";
import { commandOrControlShortcut } from "./shortcuts/shortcuts";
import React from "react";
import {
  getPlayerListSubtitle,
  getPlayerListTitle,
  splitPlayersByGroupRole,
} from "./music-assistant/delegates/player-list-display-delegate";

export default function ManagePlayerGroupsCommand() {
  const client = new MusicAssistantClient();
  const {
    isLoading,
    data: players,
    revalidate,
  } = useCachedPromise(async () => await client.getPlayers(), [], {
    keepPreviousData: true,
    initialData: [],
  });

  const groupPlayers = async (playerId: string, targetPlayerId: string, displayName: string) => {
    try {
      await client.groupPlayer(playerId, targetPlayerId);
      await showToast({
        style: Toast.Style.Success,
        title: "Player Grouped",
        message: `${displayName} added to group`,
      });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Group Player",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const ungroupPlayer = async (playerId: string, displayName: string) => {
    try {
      await client.ungroupPlayer(playerId);
      await showToast({
        style: Toast.Style.Success,
        title: "Player Ungrouped",
        message: `${displayName} removed from group`,
      });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Ungroup Player",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const addMembersToGroup = async (targetPlayerId: string, memberIds: string[], displayName: string) => {
    try {
      await client.setGroupMembers(targetPlayerId, memberIds);
      await showToast({
        style: Toast.Style.Success,
        title: "Members Added",
        message: `Added ${memberIds.length} member(s) to ${displayName}`,
      });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add Members",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const removeAllMembers = async (targetPlayerId: string, displayName: string, memberIds: string[]) => {
    try {
      await client.setGroupMembers(targetPlayerId, undefined, memberIds);
      await showToast({
        style: Toast.Style.Success,
        title: "Group Disbanded",
        message: `Removed all members from ${displayName}`,
      });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Disband Group",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const adjustMemberVolume = async (playerId: string, displayName: string, delta: number) => {
    try {
      const player = (players || []).find((p) => p.player_id === playerId);
      if (!player) return;

      const volumeBefore = player.volume_level ?? 0;
      const newVolume = Math.max(0, Math.min(100, volumeBefore + delta));

      const controller = await client.createPlayerVolumeController(playerId);
      await controller.setVolume(newVolume);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Adjust Volume",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const syncMembersWithLeader = async (leaderId: string, displayName: string) => {
    try {
      const leader = (players || []).find((p) => p.player_id === leaderId);
      if (!leader) return;

      await client.syncMembersWithLeader(leader, players || []);
      await showToast({
        style: Toast.Style.Success,
        title: "Members Synced",
        message: `All members' volume synced to ${displayName}: ${leader.volume_level}%`,
      });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Sync Members",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

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

  const getAccessories = (player: Player): List.Item.Accessory[] => {
    const accessories: List.Item.Accessory[] = [];

    // Show playback state icon
    if (player.state === "playing") {
      accessories.push({ icon: Icon.Play, tooltip: "Playing" });
    } else if (player.state === "paused") {
      accessories.push({ icon: Icon.Pause, tooltip: "Paused" });
    }

    return accessories;
  };

  const getGroupingTargets = (player: Player): Player[] => {
    // Show players that share at least one compatible grouping provider
    return (players || []).filter((target) => {
      // Can't group with yourself
      if (target.player_id === player.player_id) return false;

      // Target must be available and enabled
      if (!target.available || !target.enabled) return false;

      // Target must be standalone or a leader (not a member)
      const targetStatus = client.getGroupStatus(target);
      if (targetStatus === "Member") return false;

      // Check if players share any common grouping providers
      const hasCommonProvider = player.can_group_with.some((provider) => target.can_group_with.includes(provider));

      return hasCommonProvider;
    });
  };

  const renderPlayerActions = (player: Player) => {
    const status = client.getGroupStatus(player);
    const groupingTargets = getGroupingTargets(player);
    const compatibleStandalone = groupingTargets.filter((p) => client.getGroupStatus(p) === "Standalone");
    const compatibleLeaders = groupingTargets.filter((p) => client.isGroupLeader(p));

    return (
      <ActionPanel>
        {/* Primary action: grouping/ungrouping */}
        {status === "Standalone" && (
          <>
            {groupingTargets.length > 0 ? (
              <ActionPanel.Submenu title="Manage Grouping" icon={Icon.TwoPeople}>
                {compatibleStandalone.length > 0 && (
                  <ActionPanel.Submenu title="Create New Group with…" icon={Icon.PlusSquare}>
                    {compatibleStandalone.map((target) => (
                      <Action
                        key={target.player_id}
                        title={target.display_name}
                        onAction={() => groupPlayers(target.player_id, player.player_id, player.display_name)}
                      />
                    ))}
                  </ActionPanel.Submenu>
                )}
                {compatibleLeaders.length > 0 && (
                  <ActionPanel.Submenu title="Add to Existing Group" icon={Icon.Plus}>
                    {compatibleLeaders.map((target) => (
                      <Action
                        key={target.player_id}
                        title={`${target.display_name} (${target.group_childs.length} Member(s))`}
                        onAction={() => groupPlayers(target.player_id, player.player_id, player.display_name)}
                      />
                    ))}
                  </ActionPanel.Submenu>
                )}
              </ActionPanel.Submenu>
            ) : (
              <Action
                title="No Compatible Players Available"
                icon={Icon.XMarkCircle}
                onAction={() =>
                  showToast({
                    style: Toast.Style.Failure,
                    title: "No Compatible Players",
                    message: "This player cannot be grouped with any available players.",
                  })
                }
              />
            )}
          </>
        )}

        {status === "Member" && (
          <Action
            title="Remove from Group"
            icon={Icon.Minus}
            onAction={() => ungroupPlayer(player.player_id, player.display_name)}
          />
        )}

        {status === "Leader" && (
          <>
            {groupingTargets.length > 0 ? (
              <ActionPanel.Submenu title="Add Members" icon={Icon.Plus}>
                {groupingTargets.map((member) => (
                  <Action
                    key={member.player_id}
                    title={member.display_name}
                    onAction={() => addMembersToGroup(player.player_id, [member.player_id], player.display_name)}
                  />
                ))}
              </ActionPanel.Submenu>
            ) : (
              <Action
                title="No Compatible Players Available to Add"
                icon={Icon.XMarkCircle}
                onAction={() =>
                  showToast({
                    style: Toast.Style.Failure,
                    title: "No Compatible Players",
                    message: "No compatible players available to add to this group.",
                  })
                }
              />
            )}
            <Action
              title="Disband Group"
              icon={Icon.Minus}
              shortcut={commandOrControlShortcut("backspace")}
              onAction={() => removeAllMembers(player.player_id, player.display_name, player.group_childs)}
            />
            <Action
              title="Sync Members"
              icon={Icon.LevelMeter}
              onAction={() => syncMembersWithLeader(player.player_id, player.display_name)}
            />
          </>
        )}

        {/* Secondary actions: fine-grained volume control for group members and leaders */}
        {status === "Member" && (
          <>
            <Action
              title="Increase Volume"
              icon={Icon.Plus}
              shortcut={commandOrControlShortcut("=")}
              onAction={() => adjustMemberVolume(player.player_id, player.display_name, 5)}
            />
            <Action
              title="Decrease Volume"
              icon={Icon.Minus}
              shortcut={commandOrControlShortcut("-")}
              onAction={() => adjustMemberVolume(player.player_id, player.display_name, -5)}
            />
          </>
        )}

        {/* Fine-grained volume control for group leaders */}
        {status === "Leader" && (
          <>
            <Action
              title="Increase Volume"
              icon={Icon.Plus}
              shortcut={commandOrControlShortcut("=")}
              onAction={() => adjustMemberVolume(player.player_id, player.display_name, 5)}
            />
            <Action
              title="Decrease Volume"
              icon={Icon.Minus}
              shortcut={commandOrControlShortcut("-")}
              onAction={() => adjustMemberVolume(player.player_id, player.display_name, -5)}
            />
          </>
        )}

        <Action
          title="Reload Players"
          icon={Icon.ArrowClockwise}
          shortcut={commandOrControlShortcut("r")}
          onAction={() => revalidate()}
        />
      </ActionPanel>
    );
  };

  const { groupLeaders, standalonePlayers } = splitPlayersByGroupRole(players);

  return (
    <List isLoading={isLoading} navigationTitle="Manage Player Groups" searchBarPlaceholder="Search players">
      {/* Groups section - tree view with leaders and their members */}
      {groupLeaders.length > 0 && (
        <List.Section title="Groups" subtitle={`${groupLeaders.length} group(s)`}>
          {groupLeaders.map((leader) => {
            const groupMembers = client.getGroupMembers(leader, players || []);
            const members = groupMembers.filter((p) => p.player_id !== leader.player_id);

            return (
              <React.Fragment key={leader.player_id}>
                {/* Group Leader */}
                <List.Item
                  key={leader.player_id}
                  title={getPlayerListTitle(leader)}
                  subtitle={getPlayerListSubtitle(leader)}
                  icon={getPlayerListIcon(leader)}
                  accessories={getAccessories(leader)}
                  actions={renderPlayerActions(leader)}
                />
                {/* Group Members - nested under leader */}
                {members.map((member) => (
                  <List.Item
                    key={member.player_id}
                    title={getPlayerListTitle(member, { isMember: true })}
                    subtitle={getPlayerListSubtitle(member, { isMember: true })}
                    icon={getPlayerListIcon(member, { isMember: true })}
                    accessories={getAccessories(member)}
                    actions={renderPlayerActions(member)}
                  />
                ))}
              </React.Fragment>
            );
          })}
        </List.Section>
      )}

      {/* Standalone Players section */}
      {standalonePlayers.length > 0 && (
        <List.Section title="Standalone Players" subtitle={`${standalonePlayers.length} player(s)`}>
          {standalonePlayers.map((player) => (
            <List.Item
              key={player.player_id}
              title={getPlayerListTitle(player)}
              subtitle={getPlayerListSubtitle(player)}
              icon={getPlayerListIcon(player)}
              accessories={getAccessories(player)}
              actions={renderPlayerActions(player)}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
