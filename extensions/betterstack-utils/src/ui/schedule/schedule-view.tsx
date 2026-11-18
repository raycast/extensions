import { Detail, environment, showToast, Toast } from "@raycast/api";
import * as os from "node:os";
import { useEffect, useState } from "react";
import { TimeWindow } from "@/common/utils/date-utils";
import { buildMonthViewSvg } from "@/ui/schedule/components/month-view/month-schedule";
import { useOnCallData } from "@/hooks/use-on-call-data";
import { useSchedule } from "@/hooks/use-schedule";
import { buildWeekViewSvg } from "@/ui/schedule/components/week-view/week-schedule";
import { exportSvgToClipboard } from "@/common/utils/svg-utils";
import { TimeRange } from "@/domain/time-range";
import { OnCallEvent } from "@/domain/on-call-event";
import { ScheduleActionPanel } from "@/ui/schedule/action-panel/schedule-action-panel";
import { renderSchedule } from "@/ui/schedule/schedule-renderer";

const { WEEK } = TimeRange;

const NO_PRIMARY_SCHEDULE_ERROR_MESSAGE = "## No 'Primary' on-call schedule found in your BetterStack account.";
const SCHEDULE_LOAD_ERROR_TITLE = "## Failed to load on-call schedule";
const SCHEDULE_LOAD_ERROR_MESSAGE = "Check your API token and network connection, then reopen the extension.";

export function ScheduleView() {
  const { onCallEvents, scheduleName, onCallPageUrl, isLoading, isEmpty, hasError, refresh } = useOnCallData();
  const { timeData, userData, scheduleEvents } = useSchedule({ events: onCallEvents });
  const [markdown, setMarkdown] = useState("");

  const { userNames, onCallUser, selectedUser, setSelectedUser } = userData;
  const { timeWindow, timeRange, offset, setTimeRange, setOffset } = timeData;

  useEffect(() => {
    renderSchedule({ events: scheduleEvents, onCallUser, timeWindow, timeRange, isLoading })
      .then(setMarkdown)
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        setMarkdown(`## Schedule render error\n\n\`\`\`\n${message}\n\`\`\``);
      });
  }, [scheduleEvents, onCallUser, timeWindow, timeRange, isLoading]);

  if (hasError) {
    return <Detail markdown={[SCHEDULE_LOAD_ERROR_TITLE, SCHEDULE_LOAD_ERROR_MESSAGE].join(os.EOL)} />;
  }

  if (isEmpty) {
    return <Detail markdown={NO_PRIMARY_SCHEDULE_ERROR_MESSAGE} />;
  }

  return (
    <Detail
      isLoading={isLoading || markdown === ""}
      navigationTitle={selectedUser ? `${scheduleName} — ${selectedUser}` : scheduleName}
      markdown={markdown}
      actions={
        <ScheduleActionPanel
          currentTimeRange={timeRange}
          offset={offset}
          userNames={userNames}
          selectedUser={selectedUser}
          onCallPageUrl={onCallPageUrl}
          onTimeRangeChange={setTimeRange}
          onOffsetChange={setOffset}
          onUserSelect={setSelectedUser}
          onRefresh={refresh}
          onCopyAsPng={() => copyAsPng({ timeRange, timeWindow, events: scheduleEvents })}
        />
      }
    />
  );
}

async function copyAsPng(props: { timeRange: TimeRange; timeWindow: TimeWindow; events: OnCallEvent[] }) {
  const { timeRange, events, timeWindow } = props;
  const toast = await showToast({ style: Toast.Style.Animated, title: "Copying to clipboard..." });
  const data = { events, timeWindow };

  try {
    const svg = timeRange === WEEK ? await buildWeekViewSvg(data) : await buildMonthViewSvg(data);
    await exportSvgToClipboard(svg, environment.supportPath);
    toast.style = Toast.Style.Success;
    toast.title = "Schedule copied to clipboard";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to copy schedule";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
