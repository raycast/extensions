import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchElementSummary, SITE } from "../api/fpl";
import type { Player } from "../api/types";
import { BootstrapIndex, teamShort } from "../lib/bootstrap";
import { formatNumber, formatPrice } from "../lib/format";

interface Props {
  player: Player;
  index: BootstrapIndex;
}

/** Every gameweek this season plus past seasons for one player. */
export function PlayerHistory({ player, index }: Props) {
  const { data: summary, isLoading } = useCachedPromise(fetchElementSummary, [player.id]);
  const rows = [...(summary?.history ?? [])].reverse();
  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${player.web_name} · Gameweeks`}
      searchBarPlaceholder="Filter by opponent"
    >
      <List.Section title="This season">
        {rows.map((h) => (
          <List.Item
            key={h.fixture}
            icon={{
              source: Icon.Calendar,
              tintColor: h.total_points >= 8 ? Color.Green : h.total_points <= 2 ? Color.Red : Color.SecondaryText,
            }}
            title={`GW${h.round} ${h.was_home ? "vs" : "at"} ${teamShort(index, h.opponent_team)}`}
            subtitle={`${h.team_h_score ?? "-"} - ${h.team_a_score ?? "-"}`}
            keywords={[teamShort(index, h.opponent_team)]}
            accessories={[
              { text: `${h.minutes}'`, tooltip: "Minutes" },
              { text: `${h.goals_scored}G ${h.assists}A`, tooltip: "Goals and assists" },
              { text: `xG ${h.expected_goals} xA ${h.expected_assists}` },
              ...(h.bonus ? [{ tag: { value: `B ${h.bonus}`, color: Color.Yellow } }] : []),
              { text: formatPrice(h.value), tooltip: `Selected by ${formatNumber(h.selected)}` },
              { tag: { value: `${h.total_points} pts`, color: Color.SecondaryText } },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Player Name"
                  content={`${player.first_name} ${player.second_name}`}
                />
                <Action.OpenInBrowser title="Open Statistics on FPL" url={`${SITE}/statistics`} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Past seasons">
        {summary?.history_past.map((s) => (
          <List.Item
            key={s.season_name}
            icon={Icon.Clock}
            title={s.season_name}
            subtitle={`${formatPrice(s.start_cost)} → ${formatPrice(s.end_cost)}`}
            accessories={[
              { text: `${formatNumber(s.minutes)}'` },
              { text: `${s.goals_scored}G ${s.assists}A` },
              { tag: { value: `${s.total_points} pts`, color: Color.SecondaryText } },
            ]}
          />
        ))}
      </List.Section>
    </List>
  );
}
