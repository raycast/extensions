import { TimeRange } from "@/domain/time-range";
import { Action, Icon } from "@raycast/api";

type PreviousPeriodActionProps = {
  currentTimeRange: TimeRange;
  offset: number;
  onOffsetChange: (offset: number) => void;
};

export function PreviousPeriodAction({ currentTimeRange, offset, onOffsetChange }: PreviousPeriodActionProps) {
  const previousLabel = currentTimeRange === TimeRange.MONTH ? "Previous Month" : "Previous Week";
  return (
    <Action
      title={previousLabel}
      icon={Icon.ArrowLeft}
      shortcut={{ modifiers: [], key: "arrowLeft" }}
      onAction={() => onOffsetChange(offset - 1)}
    />
  );
}
