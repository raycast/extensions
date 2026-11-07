import { Action, ActionPanel, Icon, List, confirmAlert } from "@raycast/api";
import type { ComponentProps } from "react";
import type { Player } from "../domain/model";
import { groupCandidates, groupLeader, isGroupMember } from "../domain/grouping";
import { useMusic } from "./session";
import { PlayerActions } from "./player-actions";

export function PlayerDetail({ player }: { player: Player }) {
  return (
    <List.Item.Detail
      markdown={`## ${player.name}\n\n${player.available ? "Available" : "Offline"}. Volume shortcuts affect this player.`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Provider" text={player.provider} />
          <List.Item.Detail.Metadata.Label
            title="Volume"
            text={player.volume === undefined ? "Unsupported" : `${player.volume}%`}
          />
          <List.Item.Detail.Metadata.Label title="State" text={player.state} />
          <List.Item.Detail.Metadata.Label
            title="Synced Group Playback"
            text={player.capabilities.grouping ? "Supported" : "Unsupported"}
          />
          <List.Item.Detail.Metadata.Label title="Group Members" text={String(player.groupMemberIds.length)} />
          <List.Item.Detail.Metadata.Label title="Primary Player" text={player.groupLeaderId ?? "This player"} />
          <List.Item.Detail.Metadata.Label title="Queue" text={player.queueId ?? "No Music Assistant queue"} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export function PlayerSections({
  query,
  actions,
}: {
  query: string;
  actions: (player?: Player) => ComponentProps<typeof List.Item>["actions"];
}) {
  const { players, activeId, service, run, refresh } = useMusic();
  const matches = (player: Player) =>
    query
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .every((word) => `${player.name} ${player.provider}`.toLowerCase().includes(word));
  let leader: Player | undefined;
  let reason = "Select a primary player above to use synced group playback.";
  try {
    leader = groupLeader(players, activeId);
  } catch (error) {
    if (activeId && error instanceof Error) reason = error.message;
  }
  const candidates = leader
    ? groupCandidates(players, leader).filter((player) => player.id !== activeId && matches(player))
    : [];
  const change = (member: Player, joined: boolean) =>
    run(async () => {
      if (!activeId || !leader) return;
      const fresh = await service.getPlayers();
      const latest = fresh.find((player) => player.id === member.id);
      const target = groupLeader(fresh, activeId);
      if (
        joined &&
        latest &&
        !isGroupMember(target, latest) &&
        (latest.state === "playing" || latest.groupLeaderId || latest.activeGroupId || latest.groupMemberIds.length)
      ) {
        const approved = await confirmAlert({
          title: `Link ${latest.name} to ${target.name}?`,
          message: "This will move the player's existing playback or group membership to the selected output.",
          primaryAction: { title: "Link Player" },
        });
        if (!approved) return;
      }
      try {
        await service.setGroupMember(activeId, member.id, joined);
      } catch (error) {
        await refresh().catch(() => undefined);
        throw error;
      }
    });
  const row = (player: Player) => (
    <List.Item
      key={player.id}
      id={`player:${player.id}`}
      title={player.name}
      icon={Icon.Speaker}
      subtitle={player.provider}
      accessories={[{ text: player.id === activeId ? "Active" : player.available ? "Enter to Select" : "Offline" }]}
      detail={<PlayerDetail player={player} />}
      actions={actions(player)}
    />
  );
  return (
    <>
      <List.Section title="Available Players">
        {players.filter((player) => player.available && matches(player)).map(row)}
      </List.Section>
      <List.Section title={leader ? `Group Players · ${leader.name}` : "Group Players"}>
        {candidates.map((member) => {
          const linked = leader ? isGroupMember(leader, member) : false;
          const permanent = leader?.staticGroupMemberIds?.includes(member.id);
          return (
            <List.Item
              key={`group:${member.id}`}
              id={`group:${member.id}`}
              title={member.name}
              icon={linked ? Icon.Checkmark : Icon.Speaker}
              subtitle={member.provider}
              accessories={[{ text: permanent ? "Permanent Member" : linked ? "Linked" : "Enter to Link" }]}
              detail={<PlayerDetail player={member} />}
              actions={
                <ActionPanel>
                  <Action
                    title={linked ? "Player Already Linked" : "Add to Synced Group"}
                    icon={Icon.Link}
                    onAction={() => change(member, true)}
                  />
                  {linked && !permanent && (
                    <Action title="Remove from Synced Group" icon={Icon.Minus} onAction={() => change(member, false)} />
                  )}
                  <PlayerActions highlighted={member} />
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => run(refresh)} />
                </ActionPanel>
              }
            />
          );
        })}
        {!candidates.length && (
          <List.Item
            id="group-status"
            title={leader ? "No compatible players available" : reason}
            icon={Icon.Info}
            detail={
              <List.Item.Detail markdown={leader ? "No available compatible players match this search." : reason} />
            }
            actions={
              <ActionPanel>
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => run(refresh)} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
      <List.Section title="Offline Players">
        {players.filter((player) => !player.available && matches(player)).map(row)}
      </List.Section>
    </>
  );
}
