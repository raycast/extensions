import { Action, ActionPanel, Icon, Image, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Player } from "./external-code/interfaces";
import MusicAssistantClient from "./music-assistant-client";
import React from "react";

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

  const getIcon = (player: Player, isMember = false): Icon | Image.ImageLike => {
    // For members, always show the dot (indented)
    if (isMember) return Icon.Dot;

    // Try to get album art for this player
    const albumArt = client.getPlayerAlbumArt(player);
    if (albumArt) {
      return { source: albumArt, mask: Image.Mask.RoundedRectangle };
    }

    // Fallback to status icons
    const status = client.getGroupStatus(player);
    return status === "Standalone" ? Icon.Cd : Icon.TwoPeople;
  };

  const getTitle = (player: Player, isMember = false): string => {
    // Indent member names to create tree-like appearance
    if (isMember) {
      return `    ${player.display_name}`;
    }
    return player.display_name;
  };

  const getSubtitle = (player: Player, isMember = false): string => {
    // Members should only show "Group member", not their currently playing info
    if (isMember) return "Group member";

    // Show currently playing info for standalone players and group leaders
    const nowPlaying = client.getCurrentlyPlayingSong(player);
    if (nowPlaying) return nowPlaying;

    const status = client.getGroupStatus(player);
    if (status === "Leader") {
      return `Group leader · ${player.group_childs.length} member(s)`;
    }
    return "Standalone";
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
        {/* Primary action varies by player status */}
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
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              onAction={() => removeAllMembers(player.player_id, player.display_name, player.group_childs)}
            />
          </>
        )}

        {status === "Member" && (
          <Action
            title="Remove from Group"
            icon={Icon.Minus}
            onAction={() => ungroupPlayer(player.player_id, player.display_name)}
          />
        )}

        <Action
          title="Reload Players"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => revalidate()}
        />
      </ActionPanel>
    );
  };

  // Organize players for tree view
  const groupLeaders = players?.filter((p) => client.isGroupLeader(p)) || [];
  const standalonePlayers = players?.filter((p) => client.getGroupStatus(p) === "Standalone") || [];

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
                  title={getTitle(leader, false)}
                  subtitle={getSubtitle(leader, false)}
                  icon={getIcon(leader, false)}
                  accessories={getAccessories(leader)}
                  actions={renderPlayerActions(leader)}
                />
                {/* Group Members - nested under leader */}
                {members.map((member) => (
                  <List.Item
                    key={member.player_id}
                    title={getTitle(member, true)}
                    subtitle={getSubtitle(member, true)}
                    icon={getIcon(member, true)}
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
              title={getTitle(player, false)}
              subtitle={getSubtitle(player, false)}
              icon={getIcon(player, false)}
              accessories={getAccessories(player)}
              actions={renderPlayerActions(player)}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
