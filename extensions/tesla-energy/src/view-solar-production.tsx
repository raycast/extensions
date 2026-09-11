import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  showToast,
  Toast,
  environment,
  Clipboard,
  AI,
  getPreferenceValues,
} from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  provider,
  getToken,
  fetchEnergySites,
  fetchEnergyHistory,
  fetchSiteInfo,
  fetchSelfConsumption,
  EnergyHistoryEntry,
  SiteInfo,
  SelfConsumption,
  getCachedAiInsight,
  setCachedAiInsight,
} from "./tesla";
import {
  Period,
  getDateRange,
  formatEnergy,
  aggregateToWeek,
  aggregateToMonth,
  aggregateToYear,
  totalSolarGenerated,
  totalHomeUsed,
  totalBatteryDischarged,
  totalBatteryCharged,
  totalGridNet,
  solarPoints,
  homePoints,
  batteryPoints,
  gridPoints,
} from "./utils/energyCalc";
import { areaChart, barChart, biAreaChart, biChart } from "./utils/svgChart";
import { COLORS, ICONS } from "./utils/theme";

const PERIOD_LABELS: Record<Period, string> = {
  day: "Today",
  week: "This Week",
  month: "This Month",
  year: "Year to Date",
};

function resolveColor(isDark: boolean, dark: string, light: string): string {
  return isDark ? dark : light;
}

function peakKwh(values: number[]): string {
  const max = Math.max(...values, 0);
  if (max === 0) return "";
  return formatEnergy(max);
}

function xLabelsForDay(entries: EnergyHistoryEntry[]): string[] {
  return entries.map((e) => new Date(e.timestamp).toLocaleTimeString(undefined, { hour: "numeric" }));
}

function buildInsightPrompt(entries: EnergyHistoryEntry[], selfConsumption: SelfConsumption | null): string {
  const solar = formatEnergy(totalSolarGenerated(entries));
  const home = formatEnergy(totalHomeUsed(entries));
  const discharged = formatEnergy(totalBatteryDischarged(entries));
  const charged = formatEnergy(totalBatteryCharged(entries));
  const gridNet = totalGridNet(entries);
  const gridDesc =
    gridNet < 0
      ? `exported ${formatEnergy(Math.abs(gridNet))} to the grid`
      : `imported ${formatEnergy(gridNet)} from the grid`;
  const selfPct = selfConsumption ? `${selfConsumption.solar + selfConsumption.battery}%` : "unknown";

  return `You are a Tesla Powerwall energy assistant. Given today's energy data, write a 2-3 sentence plain-English status summary explaining what the system has been doing and why. Be specific about the numbers. Do not use bullet points or headers — just concise prose.

Today's data so far:
- Solar generated: ${solar}
- Home used: ${home}
- Powerwall discharged: ${discharged}
- Powerwall charged: ${charged}
- Grid: ${gridDesc}
- Self-powered: ${selfPct} of home energy came from solar or Powerwall

Focus on the most interesting pattern (e.g. whether the Powerwall is primarily charging or discharging, how well solar is covering home demand, and any notable grid behavior).`;
}

function buildCharts(entries: EnergyHistoryEntry[], period: Period): string {
  const isDark = environment.appearance === "dark";
  const gridlineColor = isDark ? "#555555" : "#AAAAAA";
  const labelColor = isDark ? "#CCCCCC" : "#555555";
  const opts = { width: 500, height: 134, gridlineColor, labelColor };

  const solarColor = resolveColor(isDark, COLORS.solar.dark, COLORS.solar.light);
  const homeColor = resolveColor(isDark, COLORS.home.dark, COLORS.home.light);
  const batteryPos = resolveColor(isDark, COLORS.batteryPos.dark, COLORS.batteryPos.light);
  const batteryNeg = resolveColor(isDark, COLORS.batteryNeg.dark, COLORS.batteryNeg.light);
  const gridPos = resolveColor(isDark, COLORS.gridPos.dark, COLORS.gridPos.light);
  const gridNeg = resolveColor(isDark, COLORS.gridNeg.dark, COLORS.gridNeg.light);

  if (period === "day") {
    const xLabels = xLabelsForDay(entries);
    const solar = solarPoints(entries);
    const home = homePoints(entries);
    const battery = batteryPoints(entries);
    const grid = gridPoints(entries);
    return [
      `### Solar\n\n![Solar](${areaChart(solar, solarColor, { ...opts, xLabels, peakLabel: peakKwh(solar) })})`,
      `### Home\n\n![Home](${areaChart(home, homeColor, { ...opts, xLabels, peakLabel: peakKwh(home) })})`,
      `### Powerwall\n\n![Powerwall](${biAreaChart(battery, batteryPos, batteryNeg, { ...opts, xLabels, peakLabel: peakKwh(battery.map(Math.abs)) })})`,
      `### Grid\n\n![Grid](${biAreaChart(grid, gridPos, gridNeg, { ...opts, xLabels, peakLabel: peakKwh(grid.map(Math.abs)) })})`,
    ].join("\n\n");
  }

  const { buckets, xLabels } =
    period === "week"
      ? aggregateToWeek(entries)
      : period === "month"
        ? aggregateToMonth(entries)
        : aggregateToYear(entries);

  const solar = solarPoints(buckets);
  const home = homePoints(buckets);
  const battery = batteryPoints(buckets);
  const grid = gridPoints(buckets);

  return [
    `### Solar\n\n![Solar](${barChart(solar, solarColor, { ...opts, xLabels, peakLabel: peakKwh(solar) })})`,
    `### Home\n\n![Home](${barChart(home, homeColor, { ...opts, xLabels, peakLabel: peakKwh(home) })})`,
    `### Powerwall\n\n![Powerwall](${biChart(battery, batteryPos, batteryNeg, { ...opts, xLabels, peakLabel: peakKwh(battery.map(Math.abs)) })})`,
    `### Grid\n\n![Grid](${biChart(grid, gridPos, gridNeg, { ...opts, xLabels, peakLabel: peakKwh(grid.map(Math.abs)) })})`,
  ].join("\n\n");
}

function powerwallLabel(siteInfo: SiteInfo | null): string {
  const count = siteInfo?.components?.battery_count;
  if (!count || count <= 0) return "Powerwall";
  return `Powerwall ${count}x`;
}

function Command() {
  const token = getToken();
  const { showTodaySummary } = getPreferenceValues<Preferences>();
  const [entries, setEntries] = useState<EnergyHistoryEntry[]>([]);
  const [siteInfo, setSiteInfo] = useState<SiteInfo | null>(null);
  const [selfConsumption, setSelfConsumption] = useState<SelfConsumption | null>(null);
  const [period, setPeriod] = useState<Period>("day");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  async function loadData(p: Period) {
    try {
      setIsLoading(true);
      setError(null);

      const sites = await fetchEnergySites(token);
      if (sites.length === 0) {
        setError("No Tesla energy sites found on your account.");
        return;
      }
      const siteId = sites[0].energy_site_id;

      const { startDate, endDate } = getDateRange(p);

      const [historyData, info, sc] = await Promise.all([
        fetchEnergyHistory(token, siteId, p, startDate, endDate),
        fetchSiteInfo(token, siteId),
        fetchSelfConsumption(token, siteId, p, startDate, endDate),
      ]);

      setEntries(historyData);
      setSiteInfo(info);
      setSelfConsumption(sc);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setError(message);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load data",
        message,
        primaryAction: {
          title: "Copy Error",
          onAction: () => Clipboard.copy(message),
        },
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData(period);
  }, [period]);

  useEffect(() => {
    if (!showTodaySummary || period !== "day") {
      setAiInsight(null);
      return;
    }
    if (entries.length === 0 || !environment.canAccess(AI)) return;

    const today = new Date().toISOString().slice(0, 10);
    const cached = getCachedAiInsight(today);
    if (cached) {
      setAiInsight(cached);
      return;
    }

    let cancelled = false;
    let accumulated = "";
    const prompt = buildInsightPrompt(entries, selfConsumption);
    const response = AI.ask(prompt, { creativity: "low" });

    const onData = (chunk: string) => {
      if (cancelled) return;
      accumulated += chunk;
      setAiInsight(accumulated);
    };
    response.on("data", onData);

    response
      .then(() => {
        if (!cancelled && accumulated) setCachedAiInsight(today, accumulated);
      })
      .catch(() => {
        // fail silently — insight is non-critical
      });

    return () => {
      cancelled = true;
    };
  }, [showTodaySummary, period, entries, selfConsumption]);

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}`}
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => loadData(period)} />
            <Action
              title="Copy Error"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onAction={() => Clipboard.copy(error)}
            />
          </ActionPanel>
        }
      />
    );
  }

  const hasData = entries.length > 0;
  const periodLabel = PERIOD_LABELS[period];
  const pwLabel = powerwallLabel(siteInfo);
  const gridNet = totalGridNet(entries);
  const insightBlock = period === "day" && aiInsight ? `_${aiInsight}_\n\n` : "";
  const chartsMarkdown = isLoading
    ? ""
    : hasData
      ? `## ${periodLabel}\n\n${insightBlock}${buildCharts(entries, period)}`
      : `## ${periodLabel}\n\n_No data available for this period._`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={chartsMarkdown}
      metadata={
        hasData ? (
          <Detail.Metadata>
            {selfConsumption && (
              <>
                <Detail.Metadata.Label
                  title="Self-Powered"
                  icon={{ source: ICONS.selfPower, tintColor: COLORS.selfPower.tint }}
                  text={`${selfConsumption.solar + selfConsumption.battery}%`}
                />
                <Detail.Metadata.Label
                  title="Solar"
                  icon={{ source: ICONS.solar, tintColor: COLORS.solar.tint }}
                  text={`${selfConsumption.solar}%`}
                />
                <Detail.Metadata.Label
                  title="Powerwall"
                  icon={{ source: ICONS.battery, tintColor: COLORS.batteryPos.tint }}
                  text={`${selfConsumption.battery}%`}
                />
                <Detail.Metadata.Label
                  title="Grid"
                  icon={{ source: ICONS.grid, tintColor: COLORS.gridPos.tint }}
                  text={`${100 - selfConsumption.solar - selfConsumption.battery}%`}
                />
                <Detail.Metadata.Separator />
              </>
            )}
            <Detail.Metadata.Label
              title="Solar Production"
              icon={{ source: ICONS.solar, tintColor: COLORS.solar.tint }}
              text={`${formatEnergy(totalSolarGenerated(entries))} Generated`}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Home Consumption"
              icon={{ source: ICONS.home, tintColor: COLORS.home.tint }}
              text={`${formatEnergy(totalHomeUsed(entries))} Used`}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title={`${pwLabel} Discharged`}
              icon={{ source: ICONS.battery, tintColor: COLORS.batteryPos.tint }}
              text={formatEnergy(totalBatteryDischarged(entries))}
            />
            <Detail.Metadata.Label
              title={`${pwLabel} Charged`}
              icon={{ source: ICONS.charging, tintColor: COLORS.batteryNeg.tint }}
              text={formatEnergy(totalBatteryCharged(entries))}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title={gridNet < 0 ? "Grid Net (exported)" : gridNet > 0 ? "Grid Net (imported)" : "Grid Net (balanced)"}
              icon={{
                source: ICONS.grid,
                tintColor: gridNet < 0 ? COLORS.gridNeg.tint : COLORS.gridPos.tint,
              }}
              text={formatEnergy(Math.abs(gridNet))}
            />
          </Detail.Metadata>
        ) : null
      }
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => loadData(period)} />
          <ActionPanel.Section title="Period">
            <Action title="Today" onAction={() => setPeriod("day")} />
            <Action title="This Week" onAction={() => setPeriod("week")} />
            <Action title="This Month" onAction={() => setPeriod("month")} />
            <Action title="Year to Date" onAction={() => setPeriod("year")} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default withAccessToken(provider)(Command);
