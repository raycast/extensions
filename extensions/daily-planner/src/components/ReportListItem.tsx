import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { format } from "date-fns";
import { todoSourceApplicationName } from "../api/todo-source";
import { formatDuration, formatInterval, formatRelativeDateOnly } from "../helpers/datetime";
import {
  EventReportItem,
  formatItemCount,
  GroupReportItem,
  isEventReportItem,
  isGroupReportItem,
  isTodoReportItem,
  reportGroupKey,
  ReportGroupKey,
  reportItemSortDescriptor,
  ReportItemSortDescriptor,
  TodoReportItem,
} from "../helpers/report";
import { getRelativeScaleIcon, getReportItemIcon, gray } from "../helpers/reportIcons";
import { shortcut } from "../helpers/shortcut";
import { getPercentTrackedIcon, todoSourceIcon } from "../helpers/todoListIcons";
import { TodoGroup, TodoSourceId } from "../types";
import ReportList from "./ReportList";
import TodoDetail from "./TodoDetail";

const formatForListItem = (duration: number): string => (duration !== 0 ? formatDuration(duration) : "-");

const formatForTooltip = (duration: number): string =>
  duration !== 0 ? formatDuration(duration, { style: "longUnits" }) : "none";

export default function ReportListItem({
  reportItem,
  tieredTodoGroups,
  todoTags,
  totalBlockedDuration,
  isLoading,
  isSingleDayReport,
  groupKeys,
  availableGroupKeys,
  setGroupKeys,
  showingGroupsAsItems,
  setShowingGroupsAsItems,
  sortDescriptor,
  setSortDescriptor,
  showSourceIcon,
  refresh,
}: {
  reportItem: TodoReportItem | EventReportItem | GroupReportItem;
  tieredTodoGroups: Map<TodoSourceId, TodoGroup[]> | undefined;
  todoTags: Map<TodoSourceId, Map<string, string>> | undefined;
  totalBlockedDuration: number | undefined;
  isLoading: boolean;
  isSingleDayReport: boolean;
  groupKeys: ReportGroupKey[];
  availableGroupKeys: ReportGroupKey[];
  setGroupKeys: (newValue: ReportGroupKey[]) => void;
  showingGroupsAsItems: boolean;
  setShowingGroupsAsItems: (newValue: boolean) => void;
  sortDescriptor: ReportItemSortDescriptor;
  setSortDescriptor: (newValue: ReportItemSortDescriptor) => void;
  showSourceIcon?: boolean;
  refresh: () => Promise<unknown>;
}): JSX.Element {
  const accessories: List.Item.Accessory[] = [];

  const { trackedDuration, blockedDuration, eventDuration } = reportItem;

  if (blockedDuration !== undefined) {
    const shareOfTotal = totalBlockedDuration ? blockedDuration / totalBlockedDuration : null;
    accessories.push({
      icon: shareOfTotal !== null ? { source: getRelativeScaleIcon(shareOfTotal), tintColor: gray } : Icon.Calendar,
      text: formatForListItem(blockedDuration),
      tooltip: `Blocked: ${formatForTooltip(blockedDuration)}${
        shareOfTotal !== null ? ` (${Math.round(shareOfTotal * 100)}% of total)` : ""
      }`,
    });
  }

  if (trackedDuration !== undefined) {
    const percentTracked = blockedDuration ? Math.round((trackedDuration / blockedDuration) * 100) : null;
    const percentDiff = percentTracked !== null ? percentTracked - 100 : null;
    accessories.push({
      icon: percentTracked !== null ? getPercentTrackedIcon(percentTracked) : Icon.Stopwatch,
      text: {
        color: percentTracked !== null ? Color.PrimaryText : undefined,
        value: `${formatForListItem(trackedDuration)}${percentTracked !== null ? ` ∙ ${percentTracked}%` : ""}`,
      },
      tooltip: `Tracked: ${formatForTooltip(trackedDuration)}${
        percentDiff !== null
          ? ` ∙ ${
              percentDiff === 0
                ? "Same as blocked"
                : `${Math.abs(percentDiff)}% ${percentDiff > 0 ? "more" : "less"} than blocked`
            }`
          : ""
      }`,
    });
  }

  if (eventDuration !== undefined) {
    accessories.push({
      icon: Icon.Hourglass,
      text: formatForListItem(eventDuration),
      tooltip: `Event Duration: ${formatForTooltip(eventDuration)}`,
    });
  }

  const isEvent = isEventReportItem(reportItem);

  if (showSourceIcon && !isEvent) {
    accessories.push({
      icon: { source: reportItem.sourceId ? todoSourceIcon[reportItem.sourceId] : Icon.RaycastLogoPos },
      tooltip: reportItem.sourceId ? `Source: ${todoSourceApplicationName[reportItem.sourceId]}` : undefined,
    });
  }

  return (
    <List.Item
      icon={getReportItemIcon(reportItem)}
      title={reportItem.title}
      subtitle={
        isTodoReportItem(reportItem)
          ? reportItem.completionDate
            ? {
                value: isSingleDayReport
                  ? format(reportItem.completionDate, "p")
                  : formatRelativeDateOnly(reportItem.completionDate),
                tooltip: `Completed: ${format(reportItem.completionDate, "Pp")}`,
              }
            : undefined
          : isEvent
          ? formatInterval(reportItem)
          : reportItem.itemCount !== undefined && reportItem.childType
          ? formatItemCount(reportItem.itemCount, reportItem.childType)
          : undefined
      }
      accessories={accessories}
      actions={
        <ActionPanel>
          {!isEvent ? (
            <Action.Push
              icon={isGroupReportItem(reportItem) ? Icon.List : Icon.Sidebar}
              title={isGroupReportItem(reportItem) ? "Show Group Items" : "Show Details"}
              shortcut={shortcut.showDetails}
              target={
                isGroupReportItem(reportItem) ? (
                  <ReportList
                    reportItem={reportItem}
                    tieredTodoGroups={tieredTodoGroups}
                    todoTags={todoTags}
                    isLoading={isLoading}
                    isSingleDayReport={isSingleDayReport}
                    groupKeys={groupKeys}
                    availableGroupKeys={availableGroupKeys}
                    setGroupKeys={setGroupKeys}
                    showingGroupsAsItems={showingGroupsAsItems}
                    setShowingGroupsAsItems={setShowingGroupsAsItems}
                    sortDescriptor={sortDescriptor}
                    setSortDescriptor={setSortDescriptor}
                    showSourceIcon={showSourceIcon}
                    refresh={refresh}
                  />
                ) : (
                  <TodoDetail
                    listTodoItem={reportItem}
                    tieredTodoGroups={tieredTodoGroups?.get(reportItem.sourceId)}
                    todoTags={todoTags?.get(reportItem.sourceId)}
                  />
                )
              }
            />
          ) : (
            <Action.OpenInBrowser
              icon={{ source: { light: "light/calendar-event.svg", dark: "dark/calendar-event.svg" } }}
              title="Open in Calendar"
              shortcut={shortcut.openInCalendar}
              url={`ical://ekevent/${reportItem.eventId}?method=show&options=more`}
            />
          )}

          <ActionPanel.Section>
            {availableGroupKeys.length > 0 ? (
              <ActionPanel.Submenu
                icon={Icon.Minimize}
                title="Group"
                shortcut={{ modifiers: ["shift", "cmd"], key: "g" }}
              >
                {availableGroupKeys.map((groupKey) => (
                  <Action
                    key={groupKey.title}
                    title={groupKey.title}
                    shortcut={{ modifiers: ["shift", "cmd"], key: groupKey.key }}
                    onAction={() => {
                      // `taskBlock`, if present, stays at the end.
                      const lastGroupKey = groupKeys.at(-1);
                      const updatedGroupKeys =
                        lastGroupKey === reportGroupKey.taskBlock
                          ? [...groupKeys.slice(0, -1), groupKey, lastGroupKey]
                          : groupKeys.concat(groupKey);
                      setGroupKeys(updatedGroupKeys);
                    }}
                  />
                ))}
              </ActionPanel.Submenu>
            ) : null}

            {groupKeys.length > 0 ? (
              <>
                <ActionPanel.Submenu
                  icon={Icon.Maximize}
                  title="Ungroup"
                  shortcut={{ modifiers: ["shift", "cmd"], key: "u" }}
                >
                  {groupKeys.map((groupKey) => (
                    <Action
                      key={groupKey.title}
                      title={groupKey.title}
                      shortcut={{ modifiers: ["shift", "cmd"], key: groupKey.key }}
                      onAction={() => setGroupKeys(groupKeys.filter((key) => key !== groupKey))}
                    />
                  ))}
                </ActionPanel.Submenu>

                <Action
                  icon={showingGroupsAsItems ? Icon.Folder : Icon.BulletPoints}
                  title={"Show Groups as " + (showingGroupsAsItems ? "Sections" : "Items")}
                  shortcut={{ modifiers: ["shift", "cmd"], key: "i" }}
                  onAction={() => setShowingGroupsAsItems(!showingGroupsAsItems)}
                />
              </>
            ) : null}
          </ActionPanel.Section>

          <ActionPanel.Section>
            <ActionPanel.Submenu
              icon={Icon.ArrowDown}
              title={"Sort"}
              shortcut={{ modifiers: ["shift", "cmd"], key: "s" }}
            >
              {Object.values(reportItemSortDescriptor).map((descriptor) => (
                <Action
                  key={descriptor.title}
                  icon={
                    descriptor.title === sortDescriptor.title
                      ? descriptor.ascending
                        ? Icon.ArrowUpCircleFilled
                        : Icon.ArrowDownCircleFilled
                      : descriptor.ascending
                      ? Icon.ArrowUpCircle
                      : Icon.ArrowDownCircle
                  }
                  title={descriptor.title}
                  shortcut={{ modifiers: ["shift", "cmd"], key: descriptor.key }}
                  onAction={() => setSortDescriptor(descriptor)}
                />
              ))}
            </ActionPanel.Submenu>
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => void refresh()}
            />

            <Action.OpenInBrowser
              title="Open Documentation"
              icon={Icon.Globe}
              shortcut={{ modifiers: ["shift", "cmd"], key: "h" }}
              url="https://benyn.github.io/raycast-daily-planner/generate-productivity-reports"
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
