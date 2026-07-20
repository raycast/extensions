import { TimeRange } from "@/domain/time-range";
import { Action, Icon } from "@raycast/api";
import { capitalize } from "@/common/utils/string-utils";

type ToggleTimeRangeActionProps = {
  currentTimeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
};

export function ToggleTimeRangeAction({ currentTimeRange, onTimeRangeChange }: ToggleTimeRangeActionProps) {
  const nextTimeRange = currentTimeRange === TimeRange.MONTH ? TimeRange.WEEK : TimeRange.MONTH;
  return (
    <Action
      title={`Show ${capitalize(nextTimeRange)}`}
      icon={Icon.Calendar}
      onAction={() => onTimeRangeChange(nextTimeRange)}
    />
  );
}
