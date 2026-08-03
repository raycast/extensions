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
import {
  CHART_H,
  CHART_W,
  buildChartSvg,
  sparkline,
  svgToDataUri,
} from "./lib/chart";
import { formatDuration } from "./lib/forecast";
import { load, severityOf, settings } from "./lib/load";
import { Forecast } from "./lib/types";
import { METHODOLOGY_DEEPLINK, Methodology } from "./methodology";

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
      return `![Weekly usage](file://${p}?raycast-width=${CHART_W}&raycast-height=${CHART_H})\n\n`;
    } catch {
      return "";
    }
  }
  return `![Weekly usage](${svgToDataUri(svg)}?raycast-width=${CHART_W}&raycast-height=${CHART_H})\n\n`;
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

  const markdown = [
    chartMarkdown(f, s.chartMode),
    s.chartMode === "blocks"
      ? `\`${sparkline(f.actual, 40)}\` actual\n\n\`${sparkline(f.projected, 40)}\` forecast\n`
      : "",
    f.warnings.length > 0
      ? `### Caveats\n\n${f.warnings.map((w) => `- ${w}`).join("\n")}`
      : "",
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
            text={`${timeLabel(f.windowEnd)} · in ${formatDuration(resetIn)}`}
            icon={Icon.ArrowClockwise}
          />
          <Detail.Metadata.Label
            title="Predicted limit hit"
            text={
              f.hitsLimitAt === null
                ? "Not this week"
                : `${timeLabel(f.hitsLimitAt)} · in ${formatDuration(f.hitsLimitAt - Date.now())}`
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
          <Detail.Metadata.Link
            title="Methodology"
            text="How this forecast works"
            target={METHODOLOGY_DEEPLINK}
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
          <Action.Push
            title="Methodology"
            icon={Icon.Book}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
            target={<Methodology f={f} />}
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
