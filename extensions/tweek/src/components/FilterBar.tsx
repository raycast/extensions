import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import React from "react";
import {
  DateFilterPreset,
  TaskFilterState,
  TweekCalendar,
  TweekCustomColor,
  TweekTask,
  WeekStartPreference,
} from "../types";
import { getTodayISO, isInCurrentWeek, isOverdue } from "../utils/date-utils";
import { resolveTaskColor } from "../utils/format-task";

export function applyTaskFilters(
  tasks: TweekTask[],
  filter: TaskFilterState,
  weekStartsOn: WeekStartPreference = "Monday",
  referenceDate: Date = new Date(),
): TweekTask[] {
  const todayISO = getTodayISO(referenceDate);
  const query = filter.searchText.trim().toLowerCase();

  return tasks.filter((task) => {
    // 1. Hide completed filter
    if (filter.hideCompleted && task.done) {
      return false;
    }

    // 2. Specific someday list filter
    if (filter.somedayListId !== "all") {
      if (task.listId !== filter.somedayListId) return false;
    }

    // 3. Date preset filter
    if (filter.datePreset === "today") {
      if (task.date !== todayISO) return false;
    } else if (filter.datePreset === "this_week") {
      if (!isInCurrentWeek(task.date, weekStartsOn, referenceDate))
        return false;
    } else if (filter.datePreset === "overdue") {
      if (!isOverdue(task.date, task.done, referenceDate)) return false;
    } else if (filter.datePreset === "someday") {
      if (task.date !== null && !task.listId) return false;
    }

    // 4. Color badge filter
    if (filter.colorFilter !== "all") {
      const taskColor = task.color || "blank";
      if (taskColor !== filter.colorFilter) return false;
    }

    // 5. Keyword search (matches title, note, or checklist items)
    if (query.length > 0) {
      const inTitle = task.text.toLowerCase().includes(query);
      const inNote = Boolean(
        task.note && task.note.toLowerCase().includes(query),
      );
      const inChecklist = Boolean(
        task.checklist?.some((item) => item.text.toLowerCase().includes(query)),
      );
      if (!inTitle && !inNote && !inChecklist) {
        return false;
      }
    }

    return true;
  });
}

export interface FilterBarProps {
  filter: TaskFilterState;
  totalMatchingCount: number;
  activeCalendar?: TweekCalendar;
  customColors: TweekCustomColor[];
  onUpdateFilter: (patch: Partial<TaskFilterState>) => void;
  onResetFilters: () => void;
}

export function FilterBar({
  filter,
  totalMatchingCount,
  activeCalendar,
  customColors,
  onUpdateFilter,
  onResetFilters,
}: FilterBarProps) {
  const hasActiveFilter =
    filter.datePreset !== "all" ||
    filter.colorFilter !== "all" ||
    filter.somedayListId !== "all" ||
    Boolean(filter.searchText.trim());

  if (!hasActiveFilter) {
    return null;
  }

  const presetLabelMap: Record<DateFilterPreset, string> = {
    all: "All Dates",
    today: "Today",
    this_week: "This Week",
    overdue: "Overdue",
    someday: "Someday Lists",
    upcoming_14_days: "Upcoming 14 Days",
  };

  const colorObj =
    filter.colorFilter !== "all"
      ? resolveTaskColor(filter.colorFilter, customColors)
      : null;

  return (
    <List.Section
      title="Active Filters"
      subtitle={`${totalMatchingCount} matching task${totalMatchingCount === 1 ? "" : "s"}`}
    >
      <List.Item
        id="filter-bar-summary"
        title={`Showing ${totalMatchingCount} result${totalMatchingCount === 1 ? "" : "s"}`}
        subtitle={[
          activeCalendar ? `Calendar: ${activeCalendar.name}` : null,
          filter.datePreset !== "all"
            ? `Date: ${presetLabelMap[filter.datePreset]}`
            : null,
          colorObj ? `Color: ${colorObj.label}` : null,
          filter.hideCompleted ? "Completed: Hidden" : "Completed: Visible",
        ]
          .filter(Boolean)
          .join("  •  ")}
        icon={{ source: Icon.Filter, tintColor: Color.Blue }}
        accessories={[
          {
            tag: {
              value: "Reset Filters",
              color: Color.Orange,
            },
          },
        ]}
        actions={
          <ActionPanel>
            <Action
              title="Reset All Filters"
              icon={Icon.RotateAntiClockwise}
              onAction={onResetFilters}
            />
            <Action
              title={
                filter.hideCompleted
                  ? "Show Completed Tasks"
                  : "Hide Completed Tasks"
              }
              icon={filter.hideCompleted ? Icon.Eye : Icon.EyeDisabled}
              onAction={() =>
                onUpdateFilter({ hideCompleted: !filter.hideCompleted })
              }
            />
            <ActionPanel.Submenu title="Quick Date Filter" icon={Icon.Calendar}>
              <Action
                title="All Dates (dashboard)"
                onAction={() => onUpdateFilter({ datePreset: "all" })}
              />
              <Action
                title="Today Only"
                onAction={() => onUpdateFilter({ datePreset: "today" })}
              />
              <Action
                title="This Week"
                onAction={() => onUpdateFilter({ datePreset: "this_week" })}
              />
              <Action
                title="Overdue"
                onAction={() => onUpdateFilter({ datePreset: "overdue" })}
              />
              <Action
                title="Someday Lists"
                onAction={() => onUpdateFilter({ datePreset: "someday" })}
              />
            </ActionPanel.Submenu>
          </ActionPanel>
        }
      />
    </List.Section>
  );
}
