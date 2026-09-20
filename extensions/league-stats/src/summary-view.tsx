import { Icon, Image, List } from "@raycast/api";
import { formatDuration, percent } from "./format";
import { useAssets } from "./hooks";
import { SlimMatch, summarize } from "./match";
import type { Profile } from "./profile";
import { winRateColor, winRateIcon } from "./ui";

/** The recent-games numbers behind the summary row, spelled out on a page of their own. */
export function SummaryView({ profile, matches, label }: { profile: Profile; matches: SlimMatch[]; label: string }) {
  const assets = useAssets();
  const summary = summarize(matches, profile.puuid);
  const winRate = summary.winRate ?? 0;

  const stat = (id: string, icon: Image.ImageLike, title: string, value: string) => (
    <List.Item key={id} id={id} icon={icon} title={title} accessories={[{ text: value }]} />
  );

  return (
    <List navigationTitle={`${profile.gameName} · Last ${matches.length} ${label}Matches`}>
      <List.Section title="Overview">
        <List.Item
          id="winrate"
          icon={winRateIcon(winRate)}
          title="Win Rate"
          accessories={[
            { text: `${summary.wins}W ${summary.losses}L${summary.remakes ? ` · ${summary.remakes} remade` : ""}` },
            { tag: { value: percent(summary.winRate), color: winRateColor(winRate) } },
          ]}
        />
        {stat(
          "kda-avg",
          Icon.BullsEye,
          "Average K / D / A",
          `${summary.avgKills.toFixed(1)} / ${summary.avgDeaths.toFixed(1)} / ${summary.avgAssists.toFixed(1)}`,
        )}
        {stat("kda", Icon.LineChart, "KDA", summary.kda.toFixed(2))}
        {summary.killParticipation !== undefined &&
          stat("kp", Icon.TwoPeople, "Kill Participation", percent(summary.killParticipation))}
        {stat("cs", Icon.Coins, "CS per Minute", summary.csPerMin.toFixed(1))}
        {stat("length", Icon.Clock, "Average Game Length", formatDuration(summary.avgDuration))}
      </List.Section>

      <List.Section title="Most Played">
        {summary.champions.map((champion) => {
          const rate = champion.wins / champion.games;
          return (
            <List.Item
              key={champion.championId}
              id={`champion-${champion.championId}`}
              icon={assets.championIcon(champion.championId)}
              title={assets.championName(champion.championId, champion.championName)}
              accessories={[
                {
                  text: `${champion.games} ${champion.games === 1 ? "game" : "games"} · ${champion.wins}W ${champion.games - champion.wins}L`,
                },
                { tag: { value: percent(rate), color: winRateColor(rate) } },
              ]}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
