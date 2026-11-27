import { Action, ActionPanel, environment, getPreferenceValues, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { ERROR_IN_VIEW, LancettaMissingView, OpenLancettaAction, RefreshAction } from "./lib/actions";
import { barsSVG, BARS_H, BARS_W } from "./lib/bars";
import { svgImage } from "./lib/chart";
import { tintOf } from "./lib/lancetta";
import { NumberRow } from "./lib/metadata";
import { formatDate, isMissing } from "./lib/snapshot";
import { dayDate, formatTokens, lastDays, loadClaudeTokens, NO_TOKENS, TokenUsage, usageForDays } from "./lib/tokens";

const CODEX_NOTE =
  "Codex's tokens are not kept on this Mac: Lancetta asks Codex's account for them, and shows them in its Usage pane.";

/** How many projects the list shows, and how many a day's table names. */
const PROJECTS_SHOWN = 25;
const PROJECTS_PER_DAY = 8;

const dayLabel = (day: string) =>
  dayDate(day).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

/**
 * Everything the list draws, worked out once per load, period and appearance rather than on
 * every render: the period's numbers, each day's top projects, and the charts.
 */
function view(usage: TokenUsage | undefined, count: number, dark: boolean) {
  const days = lastDays(count);
  const { perDay, total, projects } = usageForDays(usage ?? NO_TOKENS, days);
  const chart = (value: (day: string) => number) =>
    svgImage(
      barsSVG(
        days.map((day) => ({ day, value: value(day) })),
        tintOf("Claude"),
        dark,
        formatTokens,
      ),
      420,
      BARS_W,
      BARS_H,
    );

  // each day's projects in one pass over every project's days
  const byDay = new Map<string, { project: string; tokens: number }[]>();
  for (const p of projects) {
    for (const day of days) {
      const tokens = p.byDay.get(day) ?? 0;
      if (tokens === 0) continue;
      const list = byDay.get(day);
      if (list) list.push({ project: p.project, tokens });
      else byDay.set(day, [{ project: p.project, tokens }]);
    }
  }
  const dayMarkdown = (day: string, tokens: number) => {
    const top = (byDay.get(day) ?? []).sort((a, b) => b.tokens - a.tokens).slice(0, PROJECTS_PER_DAY);
    if (!top.length) return `## ${dayLabel(day)}\n\nNo Claude Code tokens this day.`;
    return [
      `## ${dayLabel(day)} · ${formatTokens(tokens)}`,
      "",
      "| Project | Tokens |",
      "| --- | ---: |",
      ...top.map((p) => `| ${p.project} | ${formatTokens(p.tokens)} |`),
    ].join("\n");
  };

  const busiest = perDay.reduce((best, d) => (d.tokens > best.tokens ? d : best), perDay[0]);
  return {
    perDay,
    total,
    active: perDay.filter((d) => d.tokens > 0).length,
    busiest,
    totalChart: chart((day) => usage?.byDay.get(day) ?? 0),
    days: [...perDay].reverse().map((d) => ({ ...d, markdown: dayMarkdown(d.day, d.tokens) })),
    projects: projects.slice(0, PROJECTS_SHOWN).map((p) => ({ ...p, chart: chart((day) => p.byDay.get(day) ?? 0) })),
    csv: ["day,tokens", ...perDay.map((d) => `${d.day},${d.tokens}`)].join("\n"),
  };
}

export default function Command() {
  const { days: daysPreference } = getPreferenceValues<Preferences.TokenUsage>();
  const count = Number(daysPreference) || 30;
  const { data, isLoading, error, revalidate } = usePromise(loadClaudeTokens, [count], ERROR_IN_VIEW);
  const dark = environment.appearance === "dark";
  const v = useMemo(() => view(data, count, dark), [data, count, dark]);

  if (error) {
    return (
      <List>
        {isMissing(error) ? (
          <LancettaMissingView onRefresh={revalidate} />
        ) : (
          <List.EmptyView
            icon={Icon.ExclamationMark}
            title="Could Not Read Lancetta's Tokens"
            description={error.message}
            actions={
              <ActionPanel>
                <RefreshAction onRefresh={revalidate} />
              </ActionPanel>
            }
          />
        )}
      </List>
    );
  }

  const actions = (
    <ActionPanel>
      <OpenLancettaAction />
      <RefreshAction onRefresh={revalidate} />
      <Action.CopyToClipboard title="Copy as CSV" content={v.csv} />
    </ActionPanel>
  );

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Filter days and projects">
      <List.Section title="Claude Code">
        <List.Item
          icon={Icon.BarChart}
          title={`Last ${count} Days`}
          accessories={[{ text: formatTokens(v.total) }]}
          actions={actions}
          detail={
            <List.Item.Detail
              markdown={v.totalChart}
              metadata={
                <List.Item.Detail.Metadata>
                  <NumberRow title="Tokens" value={formatTokens(v.total)} />
                  <NumberRow title="Per Active Day" value={v.active ? formatTokens(v.total / v.active) : "none"} />
                  <NumberRow title="Active Days" value={`${v.active} of ${count}`} />
                  {v.total > 0 && (
                    <List.Item.Detail.Metadata.Label
                      title="Busiest"
                      text={`${dayLabel(v.busiest.day)} · ${formatTokens(v.busiest.tokens)}`}
                    />
                  )}
                  <List.Item.Detail.Metadata.Separator />
                  <NumberRow title="Counted Up To" value={data?.asOf ? formatDate(data.asOf) : "loading"} />
                  <List.Item.Detail.Metadata.Label title="Counted" text="input + output + cache writes" />
                  <List.Item.Detail.Metadata.Label title="Codex" text="in Lancetta's Usage pane" />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      </List.Section>
      <List.Section title="Days">
        {v.days.map((d) => (
          <List.Item
            key={d.day}
            icon={d.tokens ? Icon.Calendar : { source: Icon.Calendar, tintColor: "#8E8E93" }}
            title={dayLabel(d.day)}
            accessories={[{ text: d.tokens ? formatTokens(d.tokens) : "—" }]}
            actions={actions}
            detail={<List.Item.Detail markdown={d.markdown} />}
          />
        ))}
      </List.Section>
      <List.Section title="Projects" subtitle={`last ${count} days`}>
        {v.projects.map((p) => (
          <List.Item
            key={p.project}
            icon={Icon.Folder}
            title={p.project}
            accessories={[{ text: formatTokens(p.tokens) }]}
            actions={actions}
            detail={
              <List.Item.Detail
                markdown={p.chart}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Project" text={p.project} />
                    <NumberRow title="Tokens" value={formatTokens(p.tokens)} />
                    <NumberRow title="Share" value={v.total ? `${Math.round((p.tokens / v.total) * 100)}%` : "—"} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))}
      </List.Section>
      <List.Section title="Codex">
        <List.Item
          icon={Icon.Info}
          title="In Lancetta's Usage Pane"
          actions={actions}
          detail={<List.Item.Detail markdown={CODEX_NOTE} />}
        />
      </List.Section>
    </List>
  );
}
