import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo } from "react";
import { linkActions, viewPlayerAction } from "./actions";
import {
  compact,
  formatDateTime,
  formatDuration,
  formatShortDateTime,
  objectiveText,
  patchName,
  queueName,
  roleName,
} from "./format";
import { useAssets } from "./hooks";
import {
  SlimMatch,
  SlimParticipant,
  canOpenPlayer,
  displayName,
  groupTeams,
  participantOf,
  resultOf,
  riotId,
} from "./match";
import { ParticipantView } from "./participant-view";
import { RESULT_COLOR, RESULT_LABEL } from "./ui";

/** Bots share the "BOT" PUUID, so they need an ID of their own to be selectable. */
function idOf(p: SlimParticipant): string {
  return canOpenPlayer(p) ? p.puuid : `bot-${p.teamId}-${p.championId}`;
}

/**
 * Everyone in one match, one row each: champion, KDA, the items they ended with, CS, and damage. The player you came
 * from is preselected. Enter opens a player's own page; ⌘↵ opens their full line for this match.
 */
export function MatchView({ match, focusPuuid }: { match: SlimMatch; focusPuuid?: string }) {
  const assets = useAssets();
  const groups = useMemo(() => groupTeams(match), [match]);
  const queue = queueName(match.queueId, match.mode);
  const focus = focusPuuid ? participantOf(match, focusPuuid) : undefined;
  const focusResult = focus ? resultOf(match, focus) : undefined;

  const playerRow = (p: SlimParticipant) => {
    const id = riotId(p);
    const items = p.items.filter(Boolean).map((itemId) => ({
      icon: assets.itemIcon(itemId, match.version),
      tooltip: assets.itemName(itemId),
    }));
    return (
      <List.Item
        key={idOf(p)}
        id={idOf(p)}
        icon={assets.championIcon(p.championId)}
        title={displayName(p)}
        // Damage lives in the subtitle, not an accessory: accessories are dropped first when a row runs out of room.
        subtitle={`${p.kills}/${p.deaths}/${p.assists}  ·  ${compact(p.damage)} dmg${p.puuid === focusPuuid ? "  ★" : ""}`}
        keywords={[assets.championName(p.championId, p.championName), id ?? "", roleName(p.role) ?? ""]}
        accessories={[...items, ...(p.cs > 0 ? [{ text: `${p.cs} CS`, tooltip: "Minions and monsters killed" }] : [])]}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              {viewPlayerAction(match, p)}
              <Action.Push
                title="View Stats"
                icon={Icon.BarChart}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                target={<ParticipantView match={match} participant={p} fromMatch />}
              />
            </ActionPanel.Section>
            {linkActions(match, p)}
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      navigationTitle={`${queue} · ${formatShortDateTime(match.start)}`}
      searchBarPlaceholder="Filter players by name, champion, or role"
      selectedItemId={focus ? idOf(focus) : undefined}
    >
      <List.Section title="Match">
        <List.Item
          id="overview"
          icon={Icon.Info}
          title={queue}
          subtitle={`Patch ${patchName(match.version)}`}
          accessories={[
            ...(focusResult ? [{ tag: { value: RESULT_LABEL[focusResult], color: RESULT_COLOR[focusResult] } }] : []),
            { icon: Icon.Clock, text: formatDuration(match.duration), tooltip: "Match length" },
            { text: formatDateTime(match.start) },
          ]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Match ID" content={match.id} />
            </ActionPanel>
          }
        />
      </List.Section>

      {groups.map((group) => {
        const outcome = match.remake ? "Remake" : group.win ? "Victory" : "Defeat";
        return (
          <List.Section
            key={group.key}
            title={`${group.label} · ${outcome}`}
            subtitle={`${group.kills} kills · ${compact(group.gold)} gold · ${compact(group.damage)} damage`}
          >
            {group.players.map(playerRow)}
            {Object.keys(group.objectives).length > 0 && (
              <List.Item
                id={`${group.key}-objectives`}
                icon={Icon.Flag}
                title="Objectives"
                subtitle={objectiveText(group.objectives)}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Match ID" content={match.id} />
                  </ActionPanel>
                }
              />
            )}
          </List.Section>
        );
      })}
    </List>
  );
}
