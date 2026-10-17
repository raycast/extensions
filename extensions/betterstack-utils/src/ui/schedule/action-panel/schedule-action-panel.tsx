import { TimeRange } from "@/domain/time-range";
import { Optional } from "@/common/utils/optional-utils";
import { ActionPanel } from "@raycast/api";
import { ToggleTimeRangeAction } from "@/ui/schedule/action-panel/actions/toggle-time-range-action";
import { PreviousPeriodAction } from "@/ui/schedule/action-panel/actions/previous-period-action";
import { NextPeriodAction } from "@/ui/schedule/action-panel/actions/next-period-action";
import { BackToCurrentAction } from "@/ui/schedule/action-panel/actions/back-to-current-action";
import { CopyScheduleAction } from "@/ui/schedule/action-panel/actions/copy-schedule-action";
import { FilterByUserSubmenu } from "@/ui/schedule/action-panel/filter-by-user-submenu";
import { ClearUserFilterAction } from "@/ui/schedule/action-panel/actions/clear-user-filter-action";
import { OpenScheduleInBrowserAction } from "@/ui/schedule/action-panel/actions/open-schedule-in-browser-action";
import { RefreshAction } from "@/ui/schedule/action-panel/actions/refresh-action";
import { CreateIncidentAction } from "@/ui/schedule/action-panel/actions/create-incident-action";

type ScheduleActionPanelProps = {
  currentTimeRange: TimeRange;
  offset: number;
  userNames: string[];
  selectedUser: string;
  onCallPageUrl: Optional<string>;
  onTimeRangeChange: (range: TimeRange) => void;
  onOffsetChange: (offset: number) => void;
  onUserSelect: (user: string) => void;
  onCopyAsPng: () => void;
  onRefresh: () => void;
};

export function ScheduleActionPanel(props: ScheduleActionPanelProps) {
  const { currentTimeRange, offset, userNames, selectedUser, onCallPageUrl } = props;
  const { onTimeRangeChange, onOffsetChange, onUserSelect, onCopyAsPng, onRefresh } = props;

  return (
    <ActionPanel>
      <ToggleTimeRangeAction currentTimeRange={currentTimeRange} onTimeRangeChange={onTimeRangeChange} />
      <PreviousPeriodAction currentTimeRange={currentTimeRange} offset={offset} onOffsetChange={onOffsetChange} />
      <NextPeriodAction currentTimeRange={currentTimeRange} offset={offset} onOffsetChange={onOffsetChange} />
      <BackToCurrentAction offset={offset} onOffsetChange={onOffsetChange} />
      <FilterByUserSubmenu userNames={userNames} selectedUser={selectedUser} onUserSelect={onUserSelect} />
      <ClearUserFilterAction selectedUser={selectedUser} onUserSelect={onUserSelect} />
      <RefreshAction onRefresh={onRefresh} />
      <CreateIncidentAction />
      <CopyScheduleAction onCopyAsPng={onCopyAsPng} />
      {onCallPageUrl && <OpenScheduleInBrowserAction url={onCallPageUrl} />}
    </ActionPanel>
  );
}
