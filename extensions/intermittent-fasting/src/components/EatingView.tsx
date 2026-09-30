import { ActionPanel, List } from "@raycast/api";
import { EnhancedItem } from "../types";
import { EATING_DURATION_MS, TIME_FORMAT_OPTIONS, EATING_COLOR } from "../constants";
import { getProgressIcon } from "@raycast/utils";
import { startItem } from "../storage";
import { StartFasting } from "./actions/startFasting";
import { ViewHistory } from "./actions/viewHistory";
import { calculateEatingProgress, formatTime } from "../utils";

export const EatingView: React.FC<{
  data: EnhancedItem[];
  revalidate: () => Promise<EnhancedItem[]>;
  isLoading: boolean;
}> = ({ data, revalidate, isLoading }) => {
  const lastItem = data[0];

  if (lastItem.end) {
    const startDate = new Date(lastItem.end);
    const eatingEndTime = new Date(startDate.getTime() + EATING_DURATION_MS);
    const progressPercentage = calculateEatingProgress(startDate, EATING_DURATION_MS);
    const progress = Math.min(progressPercentage / 100, 1);

    return (
      <List.EmptyView
        title={`Eating Window: ${progressPercentage}%`}
        description={`Started at ${formatTime(startDate, TIME_FORMAT_OPTIONS)} ・ Ends at ${formatTime(eatingEndTime, TIME_FORMAT_OPTIONS)}`}
        icon={getProgressIcon(progress, EATING_COLOR)}
        actions={
          <ActionPanel>
            <StartFasting startItem={startItem} revalidate={revalidate} />
            <ViewHistory fastingHistory={data} revalidate={revalidate} isLoading={isLoading} />
          </ActionPanel>
        }
      />
    );
  }
};
