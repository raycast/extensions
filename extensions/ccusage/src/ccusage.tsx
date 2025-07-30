import { List } from "@raycast/api";
import { DailyUsage } from "./components/DailyUsage";
import { SessionUsage } from "./components/SessionUsage";
import { CostAnalysis } from "./components/CostAnalysis";
import { ModelBreakdown } from "./components/ModelBreakdown";
import { preferences } from "./preferences";

export default function CCUsage() {
  const selectedItemId = preferences.defaultView;

  return (
    <List selectedItemId={selectedItemId} isShowingDetail>
      <DailyUsage />
      <SessionUsage />
      <CostAnalysis />
      <ModelBreakdown />
    </List>
  );
}
