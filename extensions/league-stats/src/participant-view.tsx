import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { linkActions, viewPlayerAction } from "./actions";
import {
  compact,
  formatDateTime,
  formatDuration,
  formatKda,
  multiKillName,
  patchName,
  percent,
  queueName,
  roleName,
  timeAgo,
} from "./format";
import { useAssets } from "./hooks";
import { SlimMatch, SlimParticipant, displayName, ordinal, resultOf } from "./match";
import { MatchView } from "./match-view";
import { RESULT_COLOR, RESULT_LABEL } from "./ui";

/**
 * One player's full line in one match, as a page of its own: KDA and other stats, every item bought, summoner
 * spells, and when and how long the match was.
 */
export function ParticipantView({
  match,
  participant: p,
  fromMatch = false,
}: {
  match: SlimMatch;
  participant: SlimParticipant;
  /** Opened from the list of all players: then the next step is their page, not the list again. */
  fromMatch?: boolean;
}) {
  const assets = useAssets();
  const result = resultOf(match, p);
  const champion = assets.championName(p.championId, p.championName);
  const role = roleName(p.role);
  const multiKill = multiKillName(p.largestMultiKill);
  const items = p.items.slice(0, 6).filter(Boolean);
  const trinket = p.items[6];
  const spells = p.spells.filter(Boolean);

  const actions = (
    <ActionPanel>
      <ActionPanel.Section>
        {fromMatch ? (
          viewPlayerAction(match, p)
        ) : (
          <Action.Push
            title="View All Players"
            icon={Icon.TwoPeople}
            target={<MatchView match={match} focusPuuid={p.puuid} />}
          />
        )}
        {!fromMatch && viewPlayerAction(match, p, { modifiers: ["cmd"], key: "return" })}
      </ActionPanel.Section>
      {linkActions(match, p)}
    </ActionPanel>
  );

  const stat = (id: string, icon: Image.ImageLike, title: string, value: string, tooltip?: string) => (
    <List.Item key={id} id={id} icon={icon} title={title} accessories={[{ text: value, tooltip }]} actions={actions} />
  );

  const itemRow = (id: number, slot: string, key: string) => {
    const info = assets.itemInfo(id);
    return (
      <List.Item
        key={key}
        id={key}
        icon={assets.itemIcon(id, match.version)}
        title={info.name}
        subtitle={info.plaintext}
        accessories={[
          ...(slot ? [{ tag: slot }] : []),
          ...(info.gold ? [{ text: `${info.gold.toLocaleString()} gold` }] : []),
        ]}
        actions={actions}
      />
    );
  };

  return (
    <List navigationTitle={`${displayName(p)} · ${champion}`} searchBarPlaceholder="Filter stats and items">
      <List.Section title="Performance">
        <List.Item
          id="champion"
          icon={assets.championIcon(p.championId)}
          title={champion}
          subtitle={`Level ${p.level}${role ? ` · ${role}` : ""}`}
          accessories={[
            { tag: { value: RESULT_LABEL[result], color: RESULT_COLOR[result] } },
            ...(p.placement ? [{ tag: `${ordinal(p.placement)} place` }] : []),
          ]}
          actions={actions}
        />
        {stat(
          "kda",
          Icon.BullsEye,
          "KDA",
          `${p.kills} / ${p.deaths} / ${p.assists}  ·  ${formatKda(p.kills, p.deaths, p.assists)}`,
        )}
        {p.killParticipation !== undefined &&
          stat("kp", Icon.TwoPeople, "Kill Participation", percent(p.killParticipation))}
        {multiKill && stat("multikill", Icon.Star, "Best Multikill", multiKill)}
        {p.cs > 0 &&
          stat(
            "cs",
            Icon.LineChart,
            "CS",
            `${p.cs}  (${(p.cs / (match.duration / 60)).toFixed(1)} / min)`,
            "Minions and monsters killed",
          )}
        {stat("damage", Icon.BarChart, "Damage Dealt", compact(p.damage), "Damage to champions")}
        {stat("taken", Icon.Shield, "Damage Taken", compact(p.damageTaken))}
        {stat("gold", Icon.Coins, "Gold Earned", compact(p.gold))}
        {p.vision > 0 && stat("vision", Icon.Eye, "Vision Score", String(p.vision))}
      </List.Section>

      <List.Section title="Items">
        {items.length === 0 && stat("no-items", Icon.Minus, "No items", "")}
        {items.map((id, i) => itemRow(id, "", `item-${i}`))}
        {trinket ? itemRow(trinket, "Trinket", "trinket") : null}
      </List.Section>

      <List.Section title="Summoner Spells">
        {spells.map((id) => (
          <List.Item
            key={id}
            id={`spell-${id}`}
            icon={assets.spellIcon(id)}
            title={assets.spellName(id)}
            actions={actions}
          />
        ))}
      </List.Section>

      <List.Section title="Match">
        {stat("queue", Icon.Map, "Queue", queueName(match.queueId, match.mode))}
        {stat("played", Icon.Calendar, "Played", formatDateTime(match.start), timeAgo(match.start))}
        {stat("duration", Icon.Clock, "Length", formatDuration(match.duration))}
        {stat("patch", Icon.Tag, "Patch", patchName(match.version))}
      </List.Section>
    </List>
  );
}
