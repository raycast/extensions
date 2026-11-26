// Side-panel (List.Item.Detail) with an SVG duration chart + metadata, shared by list views.
// Replaces text sparklines in list rows, which render poorly in Raycast's font.

import { Color, Icon, List } from "@raycast/api";
import { chartMarkdown, chartTheme } from "../lib/chart-image";
import { DurationBar, durationChart } from "../lib/charts";
import { formatDuration, formatTimestamp } from "../lib/format";
import { Summary } from "../lib/stats";

export interface DetailFact {
  title: string;
  text?: string;
  tag?: { text: string; color: Color };
}

export function DurationDetail(props: {
  heading: string;
  subheading?: string;
  bars: DurationBar[];
  summary?: Summary;
  facts?: DetailFact[];
}) {
  const { bars, summary } = props;
  const chart = bars.length
    ? chartMarkdown(
        durationChart(bars, { theme: chartTheme(), width: 520, height: 230, p50: summary?.p50, p90: summary?.p90 }),
        { alt: "durations", width: 340 },
      )
    : "_No finished runs in this window._";
  const md = `**${props.heading}**${props.subheading ? `  \n${props.subheading}` : ""}\n\n${chart}`;
  return (
    <List.Item.Detail
      markdown={md}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Median (p50)" text={formatDuration(summary?.p50)} />
          <List.Item.Detail.Metadata.Label title="p90" text={formatDuration(summary?.p90)} />
          <List.Item.Detail.Metadata.Label
            title="Min / Max"
            text={`${formatDuration(summary?.min)} / ${formatDuration(summary?.max)}`}
          />
          <List.Item.Detail.Metadata.Label title="Samples" text={String(summary?.n ?? 0)} />
          {(props.facts ?? []).length > 0 && <List.Item.Detail.Metadata.Separator />}
          {(props.facts ?? []).map((f) =>
            f.tag ? (
              <List.Item.Detail.Metadata.TagList key={f.title} title={f.title}>
                <List.Item.Detail.Metadata.TagList.Item text={f.tag.text} color={f.tag.color} />
              </List.Item.Detail.Metadata.TagList>
            ) : (
              <List.Item.Detail.Metadata.Label key={f.title} title={f.title} text={f.text ?? "-"} />
            ),
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export function barLabel(iso?: string | null): string {
  return formatTimestamp(iso).slice(5, 10);
}

/** Compact icon-only accessories for rows while the chart panel is open (tags squeeze titles). */
export function compactFlags(f: {
  failed?: number;
  slowRatio?: number;
  retried?: number;
  mapped?: boolean;
}): List.Item.Accessory[] {
  const out: List.Item.Accessory[] = [];
  if (f.failed)
    out.push({ icon: { source: Icon.XMarkCircle, tintColor: Color.Red }, tooltip: `${f.failed} failed run(s)` });
  if (f.slowRatio)
    out.push({
      icon: { source: Icon.Hourglass, tintColor: Color.Orange },
      tooltip: `latest ${f.slowRatio.toFixed(1)}× median`,
    });
  if (f.retried)
    out.push({
      icon: { source: Icon.RotateClockwise, tintColor: Color.Yellow },
      tooltip: `${f.retried} retried run(s)`,
    });
  if (f.mapped) out.push({ icon: { source: Icon.Layers, tintColor: Color.Purple }, tooltip: "mapped task" });
  return out;
}
