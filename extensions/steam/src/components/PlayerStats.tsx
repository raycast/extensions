import { Action, ActionPanel, Color, Detail, environment, Icon, Keyboard } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useGameData } from "../lib/fetcher";
import { chartMarkdown, renderPlayerChart } from "../lib/player-chart";
import {
  changeVsLastWeek,
  formatPercent,
  formatPlayers,
  getCurrentPlayers,
  getPlayerHistory,
  peakMonth,
  PlayerHistory,
  PlayerRange,
  pointsInRange,
  RANGE_DAYS,
  RANGE_TITLES,
  rangeStats,
  steamChartsUrl,
  steamDbChartsUrl,
} from "../lib/players";
import { LaunchActions } from "./Actions";

const RANGES: PlayerRange[] = ["48h", "1w", "1m", "max"];
const MONTH_ROWS = 12;

// The hooks' failure toast would repeat the message the screen already shows
const silent = () => undefined;

function monthsTable(history: PlayerHistory) {
  if (!history.months.length) return "";
  const rows = history.months.slice(0, MONTH_ROWS).map((month) => {
    const gain =
      month.gain === undefined ? "–" : `${month.gain >= 0 ? "+" : "−"}${formatPlayers(Math.abs(month.gain))}`;
    const pct = month.gainPct === undefined ? "–" : formatPercent(month.gainPct);
    return `| ${month.label} | ${formatPlayers(month.avg)} | ${gain} | ${pct} | ${formatPlayers(month.peak)} |`;
  });
  return ["| Month | Avg. Players | Gain | % Gain | Peak |", "|---|--:|--:|--:|--:|", ...rows].join("\n");
}

export const PlayerStats = ({ appid, name }: { appid: number; name?: string }) => {
  const [range, setRange] = useCachedState<PlayerRange>("player-range", "1w");
  const { data: gameData } = useGameData({ appid, execute: !name });
  const title = name || gameData?.name || `App ${appid}`;

  const current = useCachedPromise(getCurrentPlayers, [appid], { onError: silent });
  const history = useCachedPromise(getPlayerHistory, [appid], { onError: silent });
  const revalidate = () => {
    current.revalidate();
    history.revalidate();
  };

  const playing = current.data;
  const data = history.data;
  const stats = data ? rangeStats(data, range) : undefined;
  const change = data ? changeVsLastWeek(data.points, playing) : undefined;
  const allTimeMonth = data ? peakMonth(data) : undefined;

  const headline = [
    playing !== undefined ? `**${formatPlayers(playing)}** playing now` : undefined,
    data?.peak24h !== undefined ? `**${formatPlayers(data.peak24h)}** 24-hour peak` : undefined,
    data?.allTimePeak !== undefined ? `**${formatPlayers(data.allTimePeak)}** all-time peak` : undefined,
  ].filter(Boolean);

  let historySection: string;
  if (history.isLoading && !data) {
    historySection = "_Loading player history…_";
  } else if (!data) {
    historySection = "_Player history isn't available for this game._";
  } else {
    const svg = renderPlayerChart(pointsInRange(data.points, RANGE_DAYS[range]), {
      dark: environment.appearance === "dark",
    });
    const note = range === "max" ? "\n\n_Older points are monthly averages._" : "";
    historySection = [
      `### ${RANGE_TITLES[range]}`,
      svg ? chartMarkdown(svg) + note : "_Not enough data for a chart in this range._",
      monthsTable(data),
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  const liveError = current.error && playing === undefined ? current.error.message : undefined;
  const noCount =
    !current.isLoading && !current.error && playing === undefined
      ? "Steam has no live player count for this game."
      : "";
  const markdown = [
    `## ${title}`,
    liveError ?? (headline.length ? headline.join(" · ") : noCount),
    liveError && !data ? "" : historySection,
  ]
    .filter(Boolean)
    .join("\n\n");

  const changeColor = change === undefined ? undefined : change >= 0 ? Color.Green : Color.Red;

  return (
    <Detail
      navigationTitle={`${title} Players`}
      isLoading={current.isLoading || history.isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Playing Now"
            text={playing !== undefined ? formatPlayers(playing) : current.isLoading ? "Loading…" : "Unknown"}
          />
          {data?.peak24h !== undefined ? (
            <Detail.Metadata.Label title="24-Hour Peak" text={formatPlayers(data.peak24h)} />
          ) : null}
          {data?.allTimePeak !== undefined ? (
            <Detail.Metadata.Label
              title="All-Time Peak"
              text={formatPlayers(data.allTimePeak) + (allTimeMonth ? ` (${allTimeMonth})` : "")}
            />
          ) : null}
          {stats ? (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title={`${RANGE_TITLES[range]} Peak`} text={formatPlayers(stats.peak)} />
              <Detail.Metadata.Label
                title={range === "max" ? "Average Monthly Players" : `${RANGE_TITLES[range]} Average`}
                text={formatPlayers(stats.avg)}
              />
              <Detail.Metadata.Label
                title={range === "max" ? "Lowest Monthly Average" : `${RANGE_TITLES[range]} Low`}
                text={formatPlayers(stats.low)}
              />
            </>
          ) : null}
          {change !== undefined ? (
            <Detail.Metadata.TagList title="vs. 7 Days Ago">
              <Detail.Metadata.TagList.Item
                text={`${change >= 0 ? "▲" : "▼"} ${formatPercent(change)}`}
                color={changeColor}
              />
            </Detail.Metadata.TagList>
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="History" target={steamChartsUrl(appid)} text="SteamCharts" />
          <Detail.Metadata.Link title="" target={steamDbChartsUrl(appid)} text="SteamDB Charts" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Range">
            {RANGES.map((value, index) =>
              value === range ? null : (
                <Action
                  key={value}
                  icon={Icon.Calendar}
                  title={`Show ${RANGE_TITLES[value]}`}
                  shortcut={{
                    macOS: { modifiers: ["cmd"], key: String(index + 1) as Keyboard.KeyEquivalent },
                    Windows: { modifiers: ["ctrl"], key: String(index + 1) as Keyboard.KeyEquivalent },
                  }}
                  onAction={() => setRange(value)}
                />
              ),
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              icon={Icon.ArrowClockwise}
              title="Refresh"
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={revalidate}
            />
            {playing !== undefined ? (
              <Action.CopyToClipboard
                title="Copy Player Count"
                content={formatPlayers(playing)}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            ) : null}
            <Action.OpenInBrowser
              icon={Icon.LineChart}
              // eslint-disable-next-line @raycast/prefer-title-case
              title="Open in SteamCharts"
              url={steamChartsUrl(appid)}
            />
            <Action.OpenInBrowser
              icon={Icon.Binoculars}
              // eslint-disable-next-line @raycast/prefer-title-case
              title="Open SteamDB Charts"
              url={steamDbChartsUrl(appid)}
            />
          </ActionPanel.Section>
          <LaunchActions name={title} appid={appid} showPlayerCount={false} />
        </ActionPanel>
      }
    />
  );
};
