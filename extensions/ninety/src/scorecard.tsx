import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useState } from "react";
import { getTeamScorecard } from "./api/ninety";
import { PeriodInterval, ScorecardKpi, ScorecardScore } from "./api/types";
import { ErrorView } from "./components/ErrorView";
import { ScoreForm } from "./components/ScoreForm";
import { TeamDropdown } from "./components/TeamDropdown";
import { useTeams } from "./hooks/useTeams";
import { showError } from "./lib/errors";
import { compact, formatGoal, formatKpiValue, scoreMeetsGoal } from "./lib/format";
import { NinetyUrls } from "./lib/urls";

const INTERVALS: { value: PeriodInterval; title: string }[] = [
  { value: "weekly", title: "Weekly" },
  { value: "monthly", title: "Monthly" },
  { value: "quarterly", title: "Quarterly" },
  { value: "annual", title: "Annual" },
];

function latestScore(kpi: ScorecardKpi): ScorecardScore | undefined {
  const past = kpi.scores.filter((s) => !s.isFuture);
  return past[past.length - 1];
}

function scoreColor(score: ScorecardScore | undefined, kpi: ScorecardKpi) {
  if (!score) return undefined;
  const meets = scoreMeetsGoal({ value: score.value, goal: score.goal ?? kpi.defaultGoal }, kpi.unit);
  return meets === undefined ? undefined : meets ? Color.Green : Color.Red;
}

function kpiMarkdown(kpi: ScorecardKpi) {
  const rows = [...kpi.scores]
    .filter((s) => !s.isFuture)
    .reverse()
    .map((s) => {
      const meets = scoreMeetsGoal({ value: s.value, goal: s.goal ?? kpi.defaultGoal }, kpi.unit);
      const mark = meets === undefined ? "" : meets ? " ✅" : " 🔴";
      return `| ${s.label}${s.partialInterval ? " *(in progress)*" : ""} | ${formatKpiValue(s.value, kpi.unit)}${mark} | ${formatGoal(s.goal ?? kpi.defaultGoal, kpi.unit)} |`;
    });
  return [`# ${kpi.title}`, "| Period | Score | Goal |", "| --- | --- | --- |", ...rows].join("\n");
}

export default function Command() {
  const { teams, error: teamsError, revalidate: retryTeams } = useTeams();
  const [teamId, setTeamId] = useState("");
  const [interval, setPeriodInterval] = useCachedState<PeriodInterval>("scorecard-interval", "weekly");
  const [showDetail, setShowDetail] = useState(true);

  const { data, isLoading, error, revalidate } = useCachedPromise(getTeamScorecard, [teamId, interval], {
    execute: !!teamId,
    keepPreviousData: true,
    onError: (error) => {
      showError(error, "Couldn't load Scorecard");
    },
  });
  const groups = data?.groups ?? [];
  const hasKpis = groups.some((g) => g.kpis.length);
  const intervalTitle = INTERVALS.find((i) => i.value === interval)?.title ?? "Weekly";

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
          onAction={() => setPeriodInterval(i.value)}
        />
      ))}
    </ActionPanel.Submenu>
  );

  return (
    <List
      isLoading={isLoading || (!teamId && !teamsError)}
      isShowingDetail={showDetail && hasKpis}
      searchBarPlaceholder={`Filter ${intervalTitle} Measurables`}
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
          actions={<ActionPanel>{intervalMenu}</ActionPanel>}
        />
      )}
      {groups.map((group) => (
        <List.Section key={group.id} title={group.name} subtitle={String(group.kpis.length)}>
          {group.kpis.map((kpi) => {
            const latest = latestScore(kpi);
            const color = scoreColor(latest, kpi);
            return (
              <List.Item
                key={kpi.id}
                title={kpi.title}
                subtitle={showDetail ? undefined : kpi.ownerName}
                icon={{ source: Icon.BarChart, tintColor: color }}
                keywords={compact([kpi.ownerName, group.name])}
                accessories={
                  showDetail
                    ? [{ tag: { value: formatKpiValue(latest?.value, kpi.unit), color } }]
                    : [
                        { text: `Goal ${formatGoal(latest?.goal ?? kpi.defaultGoal, kpi.unit)}` },
                        { tag: { value: formatKpiValue(latest?.value, kpi.unit), color }, tooltip: latest?.label },
                      ]
                }
                detail={
                  <List.Item.Detail
                    markdown={kpiMarkdown(kpi)}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Owner" text={kpi.ownerName ?? "Unassigned"} />
                        <List.Item.Detail.Metadata.Label title="Goal" text={formatGoal(kpi.defaultGoal, kpi.unit)} />
                        <List.Item.Detail.Metadata.Label title="Average" text={formatKpiValue(kpi.average, kpi.unit)} />
                        <List.Item.Detail.Metadata.Label title="Total" text={formatKpiValue(kpi.total, kpi.unit)} />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action.Push
                        title="Enter Score"
                        icon={Icon.Pencil}
                        target={<ScoreForm kpi={kpi} onSaved={() => revalidate()} />}
                      />
                      <Action
                        title={showDetail ? "Hide Details" : "Show Details"}
                        icon={Icon.Sidebar}
                        shortcut={{
                          macOS: { modifiers: ["cmd"], key: "d" },
                          Windows: { modifiers: ["ctrl"], key: "d" },
                        }}
                        onAction={() => setShowDetail((v) => !v)}
                      />
                      <Action.OpenInBrowser title="Open in Ninety" url={NinetyUrls.scorecard} />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
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
