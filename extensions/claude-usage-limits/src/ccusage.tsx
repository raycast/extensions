import { Action, ActionPanel, Icon, List, openCommandPreferences } from "@raycast/api";
import { DailyUsage } from "./components/DailyUsage";
import { WeeklyUsage } from "./components/WeeklyUsage";
import { MonthlyUsage } from "./components/MonthlyUsage";
import { SessionUsage } from "./components/SessionUsage";
import { CostAnalysis } from "./components/CostAnalysis";
import { ModelBreakdown } from "./components/ModelBreakdown";
import { UsageLimits } from "./components/UsageLimits";
import { useCachedPromise } from "@raycast/utils";
import { useCCUsageReport } from "./hooks/useCCUsageReport";
import { fetchBrimAgents } from "./utils/brim-agents";
import { getSessionReport, getSummaryReport } from "./utils/usage-report";
import { getUsageCommandConfiguration } from "./preferences";

const sections = {
  today: DailyUsage,
  week: WeeklyUsage,
  month: MonthlyUsage,
  session: SessionUsage,
  cost: CostAnalysis,
  model: ModelBreakdown,
  "usage-limits": UsageLimits,
};

export default function CCUsage() {
  const configuration = getUsageCommandConfiguration();
  const visible = new Set<string>(configuration.sections.map(({ view }) => view));
  const summary = useCCUsageReport("summary", getSummaryReport, configuration.summarySections.length > 0);
  const sessions = useCCUsageReport(
    "sessions",
    getSessionReport,
    visible.has("session") || visible.has("model") || visible.has("cost"),
  );
  const limits = useCachedPromise(fetchBrimAgents, [], { execute: visible.has("usage-limits") });

  return (
    <List
      searchBarPlaceholder="Search Usage Sections"
      isLoading={summary.isLoading || sessions.isLoading || limits.isLoading}
      selectedItemId={configuration.selectedItemId}
      isShowingDetail={configuration.sections.length > 0}
    >
      {configuration.sections.map(({ view }) => {
        const Section = sections[view];
        return <Section key={view} />;
      })}
      <List.EmptyView
        title="No Sections Visible"
        description="Enable a section in this command's preferences."
        actions={
          <ActionPanel>
            <Action title="Open Command Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}
