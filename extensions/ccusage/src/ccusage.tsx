import { List } from "@raycast/api";
import { useCCUsageAvailability } from "./hooks/useCCUsageAvailability";
import { DailyUsage } from "./components/DailyUsage";
import { SessionUsage } from "./components/SessionUsage";
import { CostAnalysis } from "./components/CostAnalysis";
import { ModelBreakdown } from "./components/ModelBreakdown";
import { ErrorState } from "./components/ErrorState";
import { preferences } from "./preferences";

export default function CCUsage() {
  const { isAvailable, isLoading: availabilityLoading } = useCCUsageAvailability();

  if (availabilityLoading) {
    return <List isLoading={true} isShowingDetail />;
  }

  if (!isAvailable) {
    return <ErrorState />;
  }

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
