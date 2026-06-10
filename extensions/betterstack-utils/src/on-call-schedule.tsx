import { Action, ActionPanel, Detail, environment, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { getCurrentMonthWindow, addDays } from "./common/dates";
import { buildCombinedScheduleSvg, exportSvgToClipboard, toSvgDataUri } from "./ui/schedule/schedule";
import { useOnCallData } from "./hooks/use-on-call-data";
import { formatUserName, getCurrentOnCallUser } from "./domain/on-call-event";
import { buildColorMap, Colors, RotaColors } from "./common/colors";
import { buildScheduleSkeletonSvg } from "./ui/schedule/skeleton/schedule";
import { buildWeekViewSvg } from "./ui/schedule/components/week-view";

type TimeRange = "week" | "month";

type ScheduleActionPanelProps = {
  nextTimeRange: TimeRange;
  currentTimeRange: TimeRange;
  monthOffset: number;
  weekOffset: number;
  userNames: string[];
  selectedUser: string;
  onTimeRangeChange: (range: TimeRange) => void;
  onMonthOffsetChange: (offset: number) => void;
  onWeekOffsetChange: (offset: number) => void;
  onCopyAsPng: () => void;
  onUserSelect: (user: string) => void;
};

const NEXT_TIME_RANGE: Record<TimeRange, TimeRange> = {
  month: "week",
  week: "month",
};

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  week: "week",
  month: "month",
};

export default function Command() {
  const { events, scheduleName, isLoading, noSchedule, hasError } = useOnCallData();
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [monthOffset, setMonthOffset] = useState<number>(0);
  const [weekOffset, setWeekOffset] = useState<number>(0);

  const today = new Date();

  if (hasError) {
    return (
      <Detail
        markdown={
          "## Failed to load on-call schedule\n\nCheck your API token and network connection, then reopen the extension."
        }
      />
    );
  }

  if (noSchedule) {
    return <NoScheduleDetail />;
  }

  const userNames = [...new Set(events.map((e) => formatUserName(e.user)))].sort();
  const colorMap = buildColorMap(userNames);
  const filteredEvents = selectedUser ? events.filter((e) => formatUserName(e.user) === selectedUser) : events;

  const scheduleWindow = getCurrentMonthWindow(monthOffset);
  const weekAnchorDate = addDays(today, weekOffset * 7);

  const currentOnCall = getCurrentOnCallUser(today, events);
  const onCallName = currentOnCall ? formatUserName(currentOnCall) : undefined;
  const onCallColor = onCallName ? (colorMap.get(onCallName) ?? RotaColors.GREEN) : undefined;

  async function copyAsPng() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Copying to clipboard…" });
    try {
      const svg =
        timeRange === "week"
          ? buildWeekViewSvg({
              events: filteredEvents,
              today,
              anchorDate: weekAnchorDate,
              backgroundColor: Colors.DARK,
              allEvents: events,
            })
          : buildCombinedScheduleSvg({
              events: filteredEvents,
              today: today,
              window: scheduleWindow,
              backgroundColor: Colors.DARK,
              showTodayMarker: false,
              showOnCallPill: false,
              allEvents: events,
            });
      await exportSvgToClipboard(svg, environment.supportPath);
      toast.style = Toast.Style.Success;
      toast.title = "Schedule copied";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to copy schedule";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  function handleTimeRangeChange(range: TimeRange) {
    setTimeRange(range);
    setMonthOffset(0);
    setWeekOffset(0);
  }

  const scheduleSvgProps = {
    events: filteredEvents,
    today: today,
    window: scheduleWindow,
    backgroundColor: undefined,
    showTodayMarker: true,
    showOnCallPill: true,
    allEvents: events,
  };

  function buildScheduleMarkdown(): string {
    if (isLoading) return `![schedule](${toSvgDataUri(buildScheduleSkeletonSvg())})`;
    if (timeRange === "week") {
      return `![schedule](${toSvgDataUri(buildWeekViewSvg({ events: filteredEvents, today, anchorDate: weekAnchorDate, allEvents: events, onCallName, onCallColor }))})`;
    }
    return `![schedule](${toSvgDataUri(buildCombinedScheduleSvg(scheduleSvgProps))})`;
  }

  const markdown = buildScheduleMarkdown();

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={selectedUser ? `${scheduleName} — ${selectedUser}` : scheduleName}
      markdown={markdown}
      actions={
        <ScheduleActionPanel
          nextTimeRange={NEXT_TIME_RANGE[timeRange]}
          currentTimeRange={timeRange}
          monthOffset={monthOffset}
          weekOffset={weekOffset}
          userNames={userNames}
          selectedUser={selectedUser}
          onTimeRangeChange={handleTimeRangeChange}
          onMonthOffsetChange={setMonthOffset}
          onWeekOffsetChange={setWeekOffset}
          onCopyAsPng={copyAsPng}
          onUserSelect={setSelectedUser}
        />
      }
    />
  );
}

function NoScheduleDetail() {
  return <Detail markdown={"## No 'Primary' on-call schedule found in your BetterStack account."} />;
}

function ScheduleActionPanel({
  nextTimeRange,
  currentTimeRange,
  monthOffset,
  weekOffset,
  userNames,
  selectedUser,
  onTimeRangeChange,
  onMonthOffsetChange,
  onWeekOffsetChange,
  onCopyAsPng,
  onUserSelect,
}: ScheduleActionPanelProps) {
  return (
    <ActionPanel>
      <Action title={`Show ${TIME_RANGE_LABELS[nextTimeRange]}`} onAction={() => onTimeRangeChange(nextTimeRange)} />
      {currentTimeRange === "month" && (
        <Action
          title="Previous Month"
          shortcut={{ modifiers: [], key: "arrowLeft" }}
          onAction={() => onMonthOffsetChange(monthOffset - 1)}
        />
      )}
      {currentTimeRange === "month" && (
        <Action
          title="Next Month"
          shortcut={{ modifiers: [], key: "arrowRight" }}
          onAction={() => onMonthOffsetChange(monthOffset + 1)}
        />
      )}
      {currentTimeRange === "month" && monthOffset !== 0 && (
        <Action
          title="Back to Current Month"
          shortcut={{ modifiers: [], key: "0" }}
          onAction={() => onMonthOffsetChange(0)}
        />
      )}
      {currentTimeRange === "week" && (
        <Action
          title="Previous Week"
          shortcut={{ modifiers: [], key: "arrowLeft" }}
          onAction={() => onWeekOffsetChange(weekOffset - 1)}
        />
      )}
      {currentTimeRange === "week" && (
        <Action
          title="Next Week"
          shortcut={{ modifiers: [], key: "arrowRight" }}
          onAction={() => onWeekOffsetChange(weekOffset + 1)}
        />
      )}
      {currentTimeRange === "week" && weekOffset !== 0 && (
        <Action
          title="Back to Current Week"
          shortcut={{ modifiers: [], key: "0" }}
          onAction={() => onWeekOffsetChange(0)}
        />
      )}
      <Action
        title="Copy Schedule to Clipboard"
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        onAction={onCopyAsPng}
      />
      {userNames.length > 0 && (
        <ActionPanel.Submenu
          title={selectedUser ? `Filter: ${selectedUser}` : "Filter by User"}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
        >
          <Action title="All Users" onAction={() => onUserSelect("")} />
          {userNames.map((name) => (
            <Action key={name} title={name} onAction={() => onUserSelect(name)} />
          ))}
        </ActionPanel.Submenu>
      )}
      {selectedUser && (
        <Action
          title="Clear User Filter"
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          onAction={() => onUserSelect("")}
        />
      )}
    </ActionPanel>
  );
}
