import { useEffect } from "react";
import { Action, ActionPanel, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getFormStats, listForms, OrbiformForm, OrbiformFormStats } from "./lib/api";

export default function Command() {
  const { isLoading, data, error } = usePromise(listForms);

  useEffect(() => {
    if (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to load forms", message: error.message });
    }
  }, [error]);

  const forms = data ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select a form to view its stats...">
      {!isLoading && forms.length === 0 ? (
        <List.EmptyView title="No forms found" description="You don't have any forms in Orbiform yet." />
      ) : (
        forms.map((form) => (
          <List.Item
            key={form.id}
            title={form.title}
            subtitle={`${form.responseCount} responses`}
            actions={
              <ActionPanel>
                <Action.Push title="View Stats" icon={Icon.LineChart} target={<FormStatsDetail form={form} />} />
                <Action.OpenInBrowser title="Open in Browser" url={form.publicUrl} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

const SPARK_LEVELS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

/** Compact single-line sparkline, one character per day. Null when every day is 0 (nothing to plot). */
function sparkline(trend: { date: string; count: number }[]): string | null {
  const max = Math.max(0, ...trend.map((d) => d.count));
  if (max === 0) return null;
  return trend
    .map((d) => {
      if (d.count === 0) return SPARK_LEVELS[0];
      const level = Math.min(SPARK_LEVELS.length - 1, Math.round((d.count / max) * (SPARK_LEVELS.length - 1)));
      return SPARK_LEVELS[Math.max(level, 1)];
    })
    .join("");
}

function shortDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function weekday(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

function trendTable(trend: { date: string; count: number }[]): string {
  const rows = trend.map((d) => `| ${weekday(d.date)} | ${shortDate(d.date)} | ${d.count} |`);
  return ["| | Date | Responses |", "|:--|:--|--:|", ...rows].join("\n");
}

function renderMarkdown(form: OrbiformForm, stats?: OrbiformFormStats): string {
  if (!stats) return `# ${form.title}\n\nLoading stats...`;

  const total7d = stats.last7DaysTrend.reduce((sum, d) => sum + d.count, 0);
  const spark = sparkline(stats.last7DaysTrend);

  const lines = [`# ${form.title}`, ""];
  lines.push(
    spark
      ? `**${total7d}** response${total7d === 1 ? "" : "s"} this week&nbsp;&nbsp;·&nbsp;&nbsp;${spark}`
      : "_No responses in the last 7 days._"
  );
  lines.push("", "## Daily Breakdown", "", trendTable(stats.last7DaysTrend));
  return lines.join("\n");
}

function FormStatsDetail({ form }: { form: OrbiformForm }) {
  const { isLoading, data, error } = usePromise(getFormStats, [form.id]);

  useEffect(() => {
    if (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to load stats", message: error.message });
    }
  }, [error]);

  const total7d = data?.last7DaysTrend.reduce((sum, d) => sum + d.count, 0) ?? 0;

  return (
    <Detail
      isLoading={isLoading}
      markdown={renderMarkdown(form, data)}
      metadata={
        data ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Total Responses" text={String(data.responseCount)} icon={Icon.Envelope} />
            <Detail.Metadata.Label
              title="Conversion Rate"
              text={
                data.conversionRate > 0
                  ? `${Math.min(data.conversionRate, 100).toFixed(1)}%`
                  : "No page views yet"
              }
              icon={Icon.LineChart}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="This Week" text={`${total7d} response${total7d === 1 ? "" : "s"}`} icon={Icon.Calendar} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link title="Public Link" target={form.publicUrl} text="Open form" />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={form.publicUrl} />
          <Action.CopyToClipboard
            title="Copy Link"
            content={form.publicUrl}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
