import { Action, ActionPanel, Color, getPreferenceValues, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useState } from "react";
import { getKpiDescriptions, getTeamScorecard } from "./api/ninety";
import { PeriodInterval, ScorecardKpi, ScorecardPeriod, ScorecardScore } from "./api/types";
import { ErrorView } from "./components/ErrorView";
import { ScoreForm } from "./components/ScoreForm";
import { TeamDropdown } from "./components/TeamDropdown";
import { useTeams } from "./hooks/useTeams";
import { showError } from "./lib/errors";
import { compact, formatGoal, formatKpiValue, htmlToMarkdown, scoreMeetsGoal } from "./lib/format";
import { UPDATE_SHORTCUT } from "./lib/shortcuts";
import { NinetyUrls } from "./lib/urls";
import { useAvatar } from "./hooks/useAvatar";

const INTERVALS: { value: PeriodInterval; title: string }[] = [
  { value: "weekly", title: "Weekly" },
  { value: "monthly", title: "Monthly" },
  { value: "quarterly", title: "Quarterly" },
  { value: "annual", title: "Annual" },
];

/** A Measurable's score for the selected period, or its latest one if that period isn't listed. */
function scoreFor(kpi: ScorecardKpi, period?: ScorecardPeriod): ScorecardScore | undefined {
  if (period) return kpi.scores.find((s) => s.periodStartDate === period.periodStartDate);
  const past = kpi.scores.filter((s) => !s.isFuture);
  return past[past.length - 1];
}

function periodLabel(period?: ScorecardPeriod) {
  if (!period) return "";
  return period.partialInterval ? `${period.label} (in progress)` : period.label;
}

function scoreColor(score: ScorecardScore | undefined, kpi: ScorecardKpi) {
  if (!score) return undefined;
  const meets = scoreMeetsGoal({ value: score.value, goal: score.goal ?? kpi.defaultGoal }, kpi.unit);
  return meets === undefined ? undefined : meets ? Color.Green : Color.Red;
}

/** Score notes come back as text or HTML, or occasionally wrapped in an object. */
function noteText(note: unknown): string | undefined {
  if (typeof note === "string") return htmlToMarkdown(note) || undefined;
  if (note && typeof note === "object") {
    const record = note as Record<string, unknown>;
    return noteText(record.text ?? record.note ?? record.value);
  }
  return undefined;
}

/**
 * The whole details pane is Markdown: Raycast gives a metadata block its own fixed share of the pane,
 * which squeezes the score table, so the owner goes under the title and Average and Total become the
 * table's first rows.
 */
interface DetailOptions {
  showAverage: boolean;
  showTotal: boolean;
}

function kpiMarkdown(kpi: ScorecardKpi, description: string | undefined, options: DetailOptions) {
  const rows = [...kpi.scores]
    .filter((s) => !s.isFuture)
    .reverse()
    .map((s) => {
      const meets = scoreMeetsGoal({ value: s.value, goal: s.goal ?? kpi.defaultGoal }, kpi.unit);
      const mark = meets === undefined ? "" : meets ? " ✅" : " 🔴";
      return `| ${s.label}${s.partialInterval ? " *(in progress)*" : ""} | ${formatKpiValue(s.value, kpi.unit)}${mark} | ${formatGoal(s.goal ?? kpi.defaultGoal, kpi.unit)} |`;
    });
  const notes = [...kpi.scores].reverse().flatMap((s) => {
    const text = noteText(s.note);
    return text ? [`- **${s.label}:** ${text}`] : [];
  });
  const about = htmlToMarkdown(description);
  const averageMeets = scoreMeetsGoal({ value: kpi.average, goal: kpi.defaultGoal }, kpi.unit);
  const averageMark = averageMeets === undefined ? "" : averageMeets ? " ✅" : " 🔴";
  const summaryRows = compact([
    options.showAverage
      ? `| **Average** | **${formatKpiValue(kpi.average, kpi.unit)}**${averageMark} | ${formatGoal(kpi.defaultGoal, kpi.unit)} |`
      : undefined,
    options.showTotal ? `| **Total** | **${formatKpiValue(kpi.total, kpi.unit)}** | |` : undefined,
  ]);
  return [
    `## ${kpi.title}`,
    `👤 ${kpi.ownerName ?? "Unassigned"}`,
    "",
    ...(about ? [about, ""] : []),
    "| Period | Score | Goal |",
    "| --- | --- | --- |",
    ...summaryRows,
    ...rows,
    ...(notes.length ? ["", "### Notes", ...notes] : []),
  ].join("\n");
}

export default function Command() {
  const { showAverage, showTotal } = getPreferenceValues<Preferences.Scorecard>();
  const { ownerAccessory } = useAvatar();
  const { teams, error: teamsError, revalidate: retryTeams } = useTeams();
  const [teamId, setTeamId] = useState("");
  const [interval, setPeriodInterval] = useCachedState<PeriodInterval>("scorecard-interval", "weekly");
  const [showDetail, setShowDetail] = useState(false);
  /** Start date of the period the list shows; unset means the latest. Resets when the interval changes. */
  const [periodStart, setPeriodStart] = useState<string>();

  const { data, isLoading, error, revalidate } = useCachedPromise(getTeamScorecard, [teamId, interval], {
    execute: !!teamId,
    keepPreviousData: true,
    onError: (error) => {
      showError(error, "Couldn't load Scorecard");
    },
  });
  // Descriptions need an Owner or Admin role; for everyone else this quietly returns nothing.
  const { data: descriptions } = useCachedPromise(getKpiDescriptions, [], {
    keepPreviousData: true,
    onError: () => undefined,
  });
  const groups = data?.groups ?? [];
  const hasKpis = groups.some((g) => g.kpis.length);
  const intervalTitle = INTERVALS.find((i) => i.value === interval)?.title ?? "Weekly";

  const periods = (data?.periods ?? []).filter((p) => !p.isFuture);
  // By default, show the most recent period anyone has scored (usually last week), not an empty current one.
  const hasScores = (p: ScorecardPeriod) =>
    groups.some((g) =>
      g.kpis.some((k) => {
        const score = k.scores.find((sc) => sc.periodStartDate === p.periodStartDate);
        return score?.value !== null && score?.value !== undefined;
      }),
    );
  const defaultPeriod = [...periods].reverse().find(hasScores) ?? periods[periods.length - 1];
  const selectedPeriod = periods.find((p) => p.periodStartDate === periodStart) ?? defaultPeriod;
  const selectedIndex = selectedPeriod ? periods.indexOf(selectedPeriod) : -1;
  const shownPeriod = periodLabel(selectedPeriod);
  const changeInterval = (value: PeriodInterval) => {
    setPeriodInterval(value);
    setPeriodStart(undefined);
  };

  const periodActions = periods.length ? (
    <>
      <ActionPanel.Submenu
        title="Change Period"
        icon={Icon.Clock}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "p" },
          Windows: { modifiers: ["ctrl", "shift"], key: "p" },
        }}
      >
        {[...periods].reverse().map((p) => (
          <Action
            key={p.periodStartDate}
            title={periodLabel(p)}
            icon={p.periodStartDate === selectedPeriod?.periodStartDate ? Icon.CheckCircle : Icon.Circle}
            onAction={() => setPeriodStart(p.periodStartDate)}
          />
        ))}
      </ActionPanel.Submenu>
      {selectedIndex > 0 ? (
        <Action
          title="Previous Period"
          icon={Icon.ArrowLeft}
          shortcut={{
            macOS: { modifiers: ["cmd"], key: "[" },
            Windows: { modifiers: ["ctrl"], key: "[" },
          }}
          onAction={() => setPeriodStart(periods[selectedIndex - 1].periodStartDate)}
        />
      ) : null}
      {selectedIndex >= 0 && selectedIndex < periods.length - 1 ? (
        <Action
          title="Next Period"
          icon={Icon.ArrowRight}
          shortcut={{
            macOS: { modifiers: ["cmd"], key: "]" },
            Windows: { modifiers: ["ctrl"], key: "]" },
          }}
          onAction={() => setPeriodStart(periods[selectedIndex + 1].periodStartDate)}
        />
      ) : null}
    </>
  ) : null;

  const intervalMenu = (
    <ActionPanel.Submenu
      title="Change Interval"
      icon={Icon.Calendar}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "i" },
        Windows: { modifiers: ["ctrl", "shift"], key: "i" },
      }}
    >
      {INTERVALS.map((i) => (
        <Action
          key={i.value}
          title={i.title}
          icon={i.value === interval ? Icon.CheckCircle : Icon.Circle}
          onAction={() => changeInterval(i.value)}
        />
      ))}
    </ActionPanel.Submenu>
  );

  return (
    <List
      isLoading={isLoading || (!teamId && !teamsError)}
      isShowingDetail={showDetail && hasKpis}
      searchBarPlaceholder={`Filter ${intervalTitle} Measurables${shownPeriod ? ` · ${shownPeriod}` : ""}`}
      searchBarAccessory={<TeamDropdown id="scorecard-team" teams={teams} onChange={setTeamId} />}
    >
      {teamsError || error ? (
        <ErrorView
          title={teamsError ? "Couldn't load Teams" : "Couldn't load Scorecard"}
          error={(teamsError ?? error)!}
          onRetry={() => (teamsError ? retryTeams() : revalidate())}
        />
      ) : (
        <List.EmptyView
          icon={Icon.BarChart}
          title={`No ${intervalTitle.toLowerCase()} Measurables`}
          description="Try another interval with ⌘⇧I."
          actions={
            <ActionPanel>
              {intervalMenu}
              {periodActions}
            </ActionPanel>
          }
        />
      )}
      {groups.map((group) => (
        <List.Section key={group.id} title={group.name} subtitle={String(group.kpis.length)}>
          {group.kpis.map((kpi) => {
            const latest = scoreFor(kpi, selectedPeriod);
            const color = scoreColor(latest, kpi);
            return (
              <List.Item
                key={kpi.id}
                title={kpi.title}
                icon={{ source: Icon.BarChart, tintColor: color }}
                keywords={compact([kpi.ownerName, group.name])}
                accessories={
                  showDetail
                    ? [{ tag: { value: formatKpiValue(latest?.value, kpi.unit), color } }]
                    : compact<List.Item.Accessory>([
                        { text: `Goal ${formatGoal(latest?.goal ?? kpi.defaultGoal, kpi.unit)}` },
                        {
                          tag: { value: formatKpiValue(latest?.value, kpi.unit), color },
                          tooltip: shownPeriod || latest?.label,
                        },
                        ownerAccessory(kpi.ownerName),
                      ])
                }
                detail={
                  <List.Item.Detail markdown={kpiMarkdown(kpi, descriptions?.[kpi.id], { showAverage, showTotal })} />
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action
                        title={showDetail ? "Hide Details" : "Show Details"}
                        icon={Icon.Sidebar}
                        onAction={() => setShowDetail((v) => !v)}
                      />
                      <Action.OpenInBrowser
                        title="Open in Ninety"
                        url={NinetyUrls.kpi(interval, group.id, kpi.id, teamId)}
                      />
                      <Action.Push
                        title="Input Score"
                        icon={Icon.Pencil}
                        shortcut={UPDATE_SHORTCUT}
                        target={
                          <ScoreForm
                            kpi={kpi}
                            periodStartDate={selectedPeriod?.periodStartDate}
                            onSaved={() => revalidate()}
                          />
                        }
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      {periodActions}
                      {intervalMenu}
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                        onAction={() => revalidate()}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
