import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  environment,
  open,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { bar, buildChartSvg, sparkline, svgToDataUri } from "./lib/chart";
import { DOW_NAMES, formatDuration } from "./lib/forecast";
import { localDate } from "./lib/jsonl";
import { load, severityOf, settings } from "./lib/load";
import { Forecast } from "./lib/types";

const SEV_COLOR = {
  ok: Color.Green,
  warn: Color.Orange,
  danger: Color.Red,
} as const;

function timeLabel(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function chartMarkdown(
  f: Forecast,
  mode: "dataUri" | "file" | "blocks",
): string {
  if (mode === "blocks") return "";
  const svg = buildChartSvg(f);
  if (mode === "file") {
    try {
      mkdirSync(environment.supportPath, { recursive: true });
      const p = join(
        environment.supportPath,
        `chart-${Math.floor(Date.now() / 60000)}.svg`,
      );
      writeFileSync(p, svg);
      return `![Weekly usage](file://${p}?raycast-width=760&raycast-height=300)\n\n`;
    } catch {
      return "";
    }
  }
  return `![Weekly usage](${svgToDataUri(svg)}?raycast-width=760&raycast-height=300)\n\n`;
}

/** Per-day view of the current window: what actually happened, then what is expected. */
function dayTable(f: Forecast): string {
  const rows: string[] = [];
  const now = Date.now();
  const day = 86_400_000;

  // Cost per day inside the window, reconstructed from the actual curve.
  const perDay = new Map<string, number>();
  for (let i = 1; i < f.actual.length; i++) {
    const d = localDate(f.actual[i - 1].t);
    perDay.set(
      d,
      (perDay.get(d) ?? 0) + (f.actual[i].pct - f.actual[i - 1].pct),
    );
  }
  const projPerDay = new Map<string, number>();
  for (let i = 1; i < f.projected.length; i++) {
    const d = localDate(f.projected[i - 1].t);
    projPerDay.set(
      d,
      (projPerDay.get(d) ?? 0) + (f.projected[i].pct - f.projected[i - 1].pct),
    );
  }

  const start = new Date(f.windowStart);
  start.setHours(0, 0, 0, 0);
  const values: Array<{
    label: string;
    actual: number;
    proj: number;
    future: boolean;
    weekend: boolean;
  }> = [];
  for (let t = start.getTime(); t < f.windowEnd; t += day) {
    const d = new Date(t);
    const key = localDate(t);
    const dow = d.getDay();
    values.push({
      label: `${DOW_NAMES[dow]} ${String(d.getDate()).padStart(2, "0")}`,
      actual: perDay.get(key) ?? 0,
      proj: projPerDay.get(key) ?? 0,
      future: t + day <= now ? false : true,
      weekend: dow === 0 || dow === 6,
    });
  }
  const max = Math.max(1, ...values.map((v) => v.actual + v.proj));

  rows.push("| Day | Used % | Projected % | |");
  rows.push("| --- | --- | --- | --- |");
  for (const v of values) {
    const total = v.actual + v.proj;
    rows.push(
      `| ${v.label}${v.weekend ? " ·" : ""} | ${v.actual > 0.05 ? v.actual.toFixed(1) : "–"} | ${v.proj > 0.05 ? v.proj.toFixed(1) : "–"} | \`${bar(total, max)}\` |`,
    );
  }
  return rows.join("\n");
}

function patternTable(f: Forecast): string {
  const max = Math.max(...f.dowProfile, 0.0001);
  const rows = ["| Weekday | Learned weight | |", "| --- | --- | --- |"];
  // Monday-first reads better than the JS Sunday-first index.
  for (const i of [1, 2, 3, 4, 5, 6, 0]) {
    const rel = f.dowProfile[i] / max;
    rows.push(
      `| ${DOW_NAMES[i]} | ${(rel * 100).toFixed(0)}% | \`${bar(f.dowProfile[i], max)}\` |`,
    );
  }
  return rows.join("\n");
}

export default function Command() {
  const s = settings();
  const { data, isLoading, revalidate, error } = useCachedPromise(load, [], {
    keepPreviousData: true,
  });

  if (error && !data) {
    return (
      <Detail
        markdown={`# Cannot read Claude usage\n\n\`\`\`\n${error.message}\n\`\`\`\n\nThis extension reads your Claude Code OAuth token from the macOS Keychain item **Claude Code-credentials**. Run \`claude\` once and sign in, then retry.`}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              onAction={revalidate}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (!data) return <Detail isLoading markdown="Reading Claude usage…" />;

  const { forecast: f, limits } = data;
  const sev = severityOf(f.pctNow, s);
  const projSev = severityOf(f.pctAtReset, s);
  const resetIn = f.windowEnd - Date.now();

  const verdict =
    f.hitsLimitAt === null
      ? `**On track.** Projected **${f.pctAtReset.toFixed(0)}%** by reset — ${(100 - f.pctAtReset).toFixed(0)}% headroom.`
      : `**Projected to hit the weekly limit ${formatDuration(f.hitsLimitAt - Date.now())} from now** — ${timeLabel(f.hitsLimitAt)}, which is ${formatDuration(f.windowEnd - f.hitsLimitAt)} before the reset.`;

  const markdown = [
    chartMarkdown(f, s.chartMode),
    s.chartMode === "blocks"
      ? `\`${sparkline(f.actual, 40)}\` actual\n\n\`${sparkline(f.projected, 40)}\` forecast\n`
      : "",
    `## ${f.pctNow.toFixed(1)}% of the weekly limit used`,
    "",
    verdict,
    "",
    `Window: ${timeLabel(f.windowStart)} → ${timeLabel(f.windowEnd)} (resets in ${formatDuration(resetIn)})`,
    "",
    "### This week, day by day",
    "",
    dayTable(f),
    "",
    "### Your learned weekly pattern",
    "",
    `Weighted from ${f.profileDays} days of local transcripts, recent weeks counting more (21-day half-life).`,
    "",
    patternTable(f),
    "",
    f.warnings.length > 0
      ? `### Caveats\n\n${f.warnings.map((w) => `- ${w}`).join("\n")}`
      : "",
    "",
    "---",
    "",
    "The percentage is the real figure from Anthropic's usage endpoint. The shape of the curve and the forecast come from your local `~/.claude/projects` transcripts, calibrated against that percentage — so the forecast follows your own weekday rhythm rather than a flat average.",
  ]
    .filter((x) => x !== "")
    .join("\n");

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Weekly">
            <Detail.Metadata.TagList.Item
              text={`${f.pctNow.toFixed(1)}% now`}
              color={SEV_COLOR[sev]}
            />
            <Detail.Metadata.TagList.Item
              text={`${f.pctAtReset.toFixed(0)}% projected`}
              color={SEV_COLOR[projSev]}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label
            title="Resets"
            text={timeLabel(f.windowEnd)}
            icon={Icon.ArrowClockwise}
          />
          <Detail.Metadata.Label
            title="Predicted limit hit"
            text={
              f.hitsLimitAt === null
                ? "Not this week"
                : timeLabel(f.hitsLimitAt)
            }
            icon={
              f.hitsLimitAt === null
                ? { source: Icon.CheckCircle, tintColor: Color.Green }
                : { source: Icon.Bolt, tintColor: Color.Red }
            }
          />
          <Detail.Metadata.Separator />
          {limits.fiveHour ? (
            <Detail.Metadata.Label
              title="5-hour window"
              text={`${limits.fiveHour.utilization.toFixed(0)}%${limits.fiveHour.resetsAt ? ` · resets in ${formatDuration(limits.fiveHour.resetsAt - Date.now())}` : ""}`}
              icon={Icon.Clock}
            />
          ) : null}
          {limits.weeklyOpus ? (
            <Detail.Metadata.Label
              title="Weekly Opus"
              text={`${limits.weeklyOpus.utilization.toFixed(0)}%`}
            />
          ) : null}
          {limits.weeklySonnet ? (
            <Detail.Metadata.Label
              title="Weekly Sonnet"
              text={`${limits.weeklySonnet.utilization.toFixed(0)}%`}
            />
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Plan"
            text={limits.rateLimitTier ?? "unknown"}
          />
          <Detail.Metadata.Label
            title="Calibration"
            text={
              f.k === null
                ? "not calibrated"
                : `${f.k.toFixed(2)} % per $ · $${f.costSoFar.toFixed(2)} local this week`
            }
          />
          <Detail.Metadata.Label
            title="Real samples this window"
            text={String(f.samples.length)}
          />
          <Detail.Metadata.Label
            title="Transcripts read"
            text={`${data.filesScanned} new / ${data.filesTotal}`}
          />
          <Detail.Metadata.Label
            title="Fetched"
            text={timeLabel(limits.fetchedAt)}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
          />
          <Action
            title="Open Claude Usage Settings"
            icon={Icon.Globe}
            onAction={() => open("https://claude.ai/settings/usage")}
          />
          <Action.CopyToClipboard
            title="Copy Summary"
            content={`Claude weekly usage ${f.pctNow.toFixed(1)}%, projected ${f.pctAtReset.toFixed(0)}% at reset ${timeLabel(f.windowEnd)}. ${f.hitsLimitAt ? `Predicted limit hit ${timeLabel(f.hitsLimitAt)}.` : "No limit hit predicted."}`}
          />
          <Action.ShowInFinder
            title="Open Support Folder"
            path={environment.supportPath}
          />
        </ActionPanel>
      }
    />
  );
}
