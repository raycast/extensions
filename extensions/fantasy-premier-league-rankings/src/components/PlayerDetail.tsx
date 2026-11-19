import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { PlayerHistory } from "./PlayerHistory";
import { useCachedPromise } from "@raycast/utils";
import { fetchElementSummary, SITE } from "../api/fpl";
import type { Player } from "../api/types";
import { BootstrapIndex, playerPhotoUrl, positionShort, teamName, teamShort } from "../lib/bootstrap";
import {
  fdrColor,
  formatKickoff,
  formatNumber,
  formatPrice,
  formatPriceDelta,
  likelihoodColor,
  likelihoodLabel,
  statusColor,
  statusLabel,
} from "../lib/format";

interface Props {
  player: Player;
  index: BootstrapIndex;
}

export function PlayerDetail({ player, index }: Props) {
  const { data: summary, isLoading } = useCachedPromise(fetchElementSummary, [player.id]);

  const upcoming = summary?.fixtures.slice(0, 5) ?? [];
  const recent = [...(summary?.history ?? [])].reverse().slice(0, 5);
  const tonight = player.price_change_projections?.[0];

  const markdown = [
    `# ${player.first_name} ${player.second_name}`,
    `**${teamName(index, player.team)}** · ${positionShort(index, player.element_type)}`,
    ``,
    `![](${playerPhotoUrl(player)})`,
    player.news ? `\n> ${player.news}` : "",
    ``,
    `## Upcoming fixtures`,
    ...upcoming.map(
      (f) =>
        `- GW${f.event ?? "?"} ${f.is_home ? "vs" : "at"} **${teamShort(index, f.is_home ? f.team_a : f.team_h)}** ` +
        `(FDR ${f.difficulty}) - ${formatKickoff(f.kickoff_time)}`,
    ),
    ``,
    `## Recent gameweeks`,
    recent.length ? `| GW | Opp | Pts | Min | G | A | CS | Bonus | xG | xA |` : "_No appearances yet_",
    recent.length ? `|---|---|---|---|---|---|---|---|---|---|` : "",
    ...recent.map(
      (h) =>
        `| ${h.round} | ${teamShort(index, h.opponent_team)} ${h.was_home ? "(H)" : "(A)"} | **${h.total_points}** | ${h.minutes} | ${h.goals_scored} | ${h.assists} | ${h.clean_sheets} | ${h.bonus} | ${h.expected_goals} | ${h.expected_assists} |`,
    ),
  ].join("\n");

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={player.web_name}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={statusLabel(player)} color={statusColor(player.status)} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Price" text={formatPrice(player.now_cost)} />
          <Detail.Metadata.Label
            title="Price change (season)"
            text={formatPriceDelta(player.cost_change_start) || "±£0.0m"}
          />
          {tonight && (
            <Detail.Metadata.TagList title="Price projection tonight">
              <Detail.Metadata.TagList.Item
                text={`${tonight.likelihood > 0 ? "Rise" : tonight.likelihood < 0 ? "Fall" : "Hold"} · ${likelihoodLabel(tonight.likelihood)}`}
                color={likelihoodColor(tonight.likelihood)}
              />
              <Detail.Metadata.TagList.Item text={`${player.price_change_percent}%`} color={Color.SecondaryText} />
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Total points" text={String(player.total_points)} />
          <Detail.Metadata.Label title="Points per game" text={player.points_per_game} />
          <Detail.Metadata.Label title="Form" text={player.form} />
          <Detail.Metadata.Label title="Expected points next GW" text={player.ep_next} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Minutes" text={formatNumber(player.minutes)} />
          <Detail.Metadata.Label title="Goals / Assists" text={`${player.goals_scored} / ${player.assists}`} />
          <Detail.Metadata.Label title="xG / xA" text={`${player.expected_goals} / ${player.expected_assists}`} />
          <Detail.Metadata.Label title="Clean sheets" text={String(player.clean_sheets)} />
          <Detail.Metadata.Label title="Bonus" text={String(player.bonus)} />
          <Detail.Metadata.Label title="ICT index" text={player.ict_index} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Selected by" text={`${player.selected_by_percent}%`} />
          <Detail.Metadata.Label
            title="Transfers this GW"
            text={`+${formatNumber(player.transfers_in_event)} / -${formatNumber(player.transfers_out_event)}`}
          />
          {upcoming.length > 0 && (
            <Detail.Metadata.TagList title="Next 5 FDR">
              {upcoming.map((f) => (
                <Detail.Metadata.TagList.Item
                  key={f.id}
                  text={`${teamShort(index, f.is_home ? f.team_a : f.team_h)} ${f.is_home ? "(H)" : "(A)"}`}
                  color={fdrColor(f.difficulty)}
                />
              ))}
            </Detail.Metadata.TagList>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Show All Gameweeks"
            icon={Icon.Calendar}
            target={<PlayerHistory player={player} index={index} />}
          />
          <Action.OpenInBrowser title="Open Statistics on FPL" url={`${SITE}/statistics`} />
          <Action.CopyToClipboard title="Copy Player Name" content={`${player.first_name} ${player.second_name}`} />
        </ActionPanel>
      }
    />
  );
}
