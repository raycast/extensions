import { TimeRange } from "@/domain/time-range";
import { Action, Icon } from "@raycast/api";

type NextPeriodActionProps = {
  currentTimeRange: TimeRange;
  offset: number;
  onOffsetChange: (offset: number) => void;
};

export function NextPeriodAction({ currentTimeRange, offset, onOffsetChange }: NextPeriodActionProps) {
  const nextLabel = currentTimeRange === TimeRange.MONTH ? "Next Month" : "Next Week";
  return (
    <Action
      title={nextLabel}
      icon={Icon.ArrowRight}
      shortcut={{ modifiers: [], key: "arrowRight" }}
      onAction={() => onOffsetChange(offset + 1)}
    />
  );
}
