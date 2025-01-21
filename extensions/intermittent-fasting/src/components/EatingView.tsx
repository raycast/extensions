import { ActionPanel, List } from "@raycast/api";
import { EnhancedItem } from "../types";
import { EATING_DURATION_MS, TIME_FORMAT_OPTIONS, EATING_COLOR } from "../constants";
import { getProgressIcon } from "@raycast/utils";
import { startItem } from "../storage";
import { StartFasting } from "./actions/startFasting";
import { ViewHistory } from "./actions/viewHistory";

export const EatingView: React.FC<{
  data: EnhancedItem[];
  revalidate: () => Promise<EnhancedItem[]>;
  isLoading: boolean;
}> = ({ data, revalidate, isLoading }) => {
  const lastItem = data[0];

  if (lastItem.end) {
    const now = new Date();
    const startDate = lastItem?.end ? new Date(lastItem.end) : now;
    const eatingEndTime = new Date(startDate.getTime() + EATING_DURATION_MS);
    const elapsedTime = now.getTime() - startDate.getTime();
    const progress = Math.min(elapsedTime / EATING_DURATION_MS, 1);
    const progressPercentage = Math.round(progress * 100);

    return (
      <List.EmptyView
        title={`Eating Window: ${progressPercentage}%`}
        description={`Started at ${startDate.toLocaleTimeString(undefined, TIME_FORMAT_OPTIONS)} ・ Ends at ${eatingEndTime.toLocaleTimeString(undefined, TIME_FORMAT_OPTIONS)}`}
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
