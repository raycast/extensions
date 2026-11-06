import { Action, ActionPanel, Icon, List, openCommandPreferences } from "@raycast/api";
import { DailyUsage } from "./components/DailyUsage";
import { WeeklyUsage } from "./components/WeeklyUsage";
import { MonthlyUsage } from "./components/MonthlyUsage";
import { SessionUsage } from "./components/SessionUsage";
import { CostAnalysis } from "./components/CostAnalysis";
import { ModelBreakdown } from "./components/ModelBreakdown";
import { UsageLimits } from "./components/UsageLimits";
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

  return (
    <List selectedItemId={configuration.selectedItemId} isShowingDetail={configuration.sections.length > 0}>
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
