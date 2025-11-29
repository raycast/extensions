import {
  ActionPanel,
  Action,
  Icon,
  List,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { NormalizedTimeEntry, formatDate, formatDuration } from "./bamboo/api";
import { Preferences } from "./preferences";
import {
  formatDateLabel,
  entryDurationMs,
  startOfMonth,
  endOfMonth,
  toNumber,
  getUserDayOffs,
  generateMonthlyCalendar,
  DayOffInfo,
} from "./helpers";
import { useProjects } from "./timesheet/hooks";
import { useTimesheetActions } from "./timesheet/hooks";
import { EditForm } from "./timesheet/components";
import { TimeEntryItem } from "./timesheet/components";
import { HolidayItem } from "./timesheet/components";
import { EmptyDayItem } from "./timesheet/components";

interface TimesheetState {
  entries: NormalizedTimeEntry[];
  dayOffs: DayOffInfo[];
  isLoading: boolean;
  currentDate: Date;
}

export default function Command() {
  const [state, setState] = useState<TimesheetState>({
    entries: [],
    dayOffs: [],
    isLoading: true,
    currentDate: new Date(),
  });
  const preferences = getPreferenceValues<Preferences>();
  const splitGapMinutes = toNumber(preferences.defaultPauseDuration, 30);
  const splitGapMs = Math.max(0, splitGapMinutes * 60 * 1000);
  const projectsState = useProjects(preferences);
  const timesheetActions = useTimesheetActions({
    preferences,
    onRefresh: loadTimesheet,
  });

  useEffect(() => {
    void loadTimesheet();
  }, []);

  useEffect(() => {
    void loadTimesheet();
  }, [state.currentDate]);

  const monthlyCalendar = useMemo(() => {
    return generateMonthlyCalendar(
      state.currentDate.getFullYear(),
      state.currentDate.getMonth(),
      state.entries,
      state.dayOffs,
      preferences.includeWeekends,
    );
  }, [
    state.entries,
    state.dayOffs,
    preferences.includeWeekends,
    state.currentDate,
  ]);

  const monthlyTotalMs = useMemo(() => {
    return state.entries.reduce(
      (total, entry) => total + entryDurationMs(entry),
      0,
    );
  }, [state.entries]);

  const monthlyTotal = formatDuration(monthlyTotalMs);
  const currentMonth = state.currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const today = new Date();
  const isCurrentMonth =
    state.currentDate.getFullYear() === today.getFullYear() &&
    state.currentDate.getMonth() === today.getMonth();

  async function loadTimesheet() {
    setState((previous) => ({ ...previous, isLoading: true }));

    try {
      const start = startOfMonth(state.currentDate);
      const end = endOfMonth(state.currentDate);
      const startStr = formatDate(start);
      const endStr = formatDate(end);

      const { createClient } = await import("./helpers");
      const client = createClient(preferences);
      const [entries, dayOffs] = await Promise.all([
        client.getTimesheetEntries(startStr, endStr),
        getUserDayOffs(startStr, endStr, preferences),
      ]);

      setState((previous) => ({
        ...previous,
        entries,
        dayOffs,
        isLoading: false,
      }));
    } catch (error) {
      const { showToast, Toast } = await import("@raycast/api");
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      await showToast(Toast.Style.Failure, "Failed to load timesheet", message);
      setState((previous) => ({ ...previous, isLoading: false }));
    }
  }

  function goToPreviousMonth() {
    const previousMonth = new Date(state.currentDate);
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    setState((previous) => ({ ...previous, currentDate: previousMonth }));
  }

  function goToNextMonth() {
    const nextMonth = new Date(state.currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const today = new Date();

    // Don't allow navigation beyond current month
    if (
      nextMonth.getFullYear() > today.getFullYear() ||
      (nextMonth.getFullYear() === today.getFullYear() &&
        nextMonth.getMonth() > today.getMonth())
    ) {
      return;
    }

    setState((previous) => ({ ...previous, currentDate: nextMonth }));
  }

  function goToCurrentMonth() {
    setState((previous) => ({ ...previous, currentDate: new Date() }));
  }

  return (
    <List
      isLoading={state.isLoading}
      searchBarPlaceholder="Filter by date, type, or note"
      navigationTitle={`${currentMonth} • ${monthlyTotal}`}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Add Entry"
              icon={Icon.Plus}
              target={
                <EditForm
                  mode="add"
                  date={today.toISOString().split("T")[0]}
                  existingEntries={[]}
                  projects={projectsState.projects}
                  projectsLoading={projectsState.isLoading}
                  preferences={preferences}
                  onSave={async ({ toCreate }) => {
                    for (const input of toCreate) {
                      await timesheetActions.handleSave(input);
                    }
                  }}
                />
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Navigation">
            <Action
              title="Previous Month"
              icon={Icon.ArrowLeft}
              onAction={goToPreviousMonth}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "arrowLeft" },
                Windows: { modifiers: ["ctrl"], key: "arrowLeft" },
              }}
            />
            <Action
              title="Next Month"
              icon={Icon.ArrowRight}
              onAction={goToNextMonth}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "arrowRight" },
                Windows: { modifiers: ["ctrl"], key: "arrowRight" },
              }}
            />
            {!isCurrentMonth ? (
              <Action
                title="Current Month"
                icon={Icon.Calendar}
                onAction={goToCurrentMonth}
                shortcut={{
                  macOS: { modifiers: ["cmd"], key: "t" },
                  Windows: { modifiers: ["ctrl"], key: "t" },
                }}
              />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={() => void loadTimesheet()}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "r" },
                Windows: { modifiers: ["ctrl"], key: "r" },
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {state.isLoading ? (
        <List.EmptyView
          title="Loading timesheet..."
          description="Fetching your time entries and calendar information."
        />
      ) : Array.from(monthlyCalendar.values()).length === 0 ? (
        <List.EmptyView
          title="No entries found"
          description="Clock time to see your entries for this month."
        />
      ) : (
        Array.from(monthlyCalendar.values())
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((dayInfo) => {
            const dayTotalMs = dayInfo.entries.reduce(
              (sum, entry) => sum + entryDurationMs(entry),
              0,
            );

            return (
              <List.Section
                key={dayInfo.date}
                title={formatDateLabel(dayInfo.date, dayTotalMs)}
              >
                {dayInfo.hasEntries ? (
                  dayInfo.entries.map((entry, index) => (
                    <TimeEntryItem
                      key={
                        entry.id ??
                        `${dayInfo.date}-${entry.start?.getTime() ?? entry.end?.getTime() ?? index}`
                      }
                      entry={entry}
                      dayDate={dayInfo.date}
                      dayEntries={dayInfo.entries}
                      index={index}
                      preferences={preferences}
                      splitGapMs={splitGapMs}
                      projects={projectsState.projects}
                      projectsLoading={projectsState.isLoading}
                      isCurrentMonth={isCurrentMonth}
                      onSave={timesheetActions.handleSave}
                      onDelete={timesheetActions.handleDelete}
                      onDaySave={timesheetActions.handleDaySave}
                      goToPreviousMonth={goToPreviousMonth}
                      goToNextMonth={goToNextMonth}
                      goToCurrentMonth={goToCurrentMonth}
                      onRefresh={loadTimesheet}
                    />
                  ))
                ) : dayInfo.dayOff ? (
                  <HolidayItem
                    dayOff={dayInfo.dayOff}
                    dayDate={dayInfo.date}
                    projects={projectsState.projects}
                    projectsLoading={projectsState.isLoading}
                    isCurrentMonth={isCurrentMonth}
                    preferences={preferences}
                    onSave={timesheetActions.handleSave}
                    goToPreviousMonth={goToPreviousMonth}
                    goToNextMonth={goToNextMonth}
                    goToCurrentMonth={goToCurrentMonth}
                    onRefresh={loadTimesheet}
                  />
                ) : (
                  <EmptyDayItem
                    dayDate={dayInfo.date}
                    projects={projectsState.projects}
                    projectsLoading={projectsState.isLoading}
                    isCurrentMonth={isCurrentMonth}
                    preferences={preferences}
                    onSave={timesheetActions.handleSave}
                    goToPreviousMonth={goToPreviousMonth}
                    goToNextMonth={goToNextMonth}
                    goToCurrentMonth={goToCurrentMonth}
                    onRefresh={loadTimesheet}
                  />
                )}
              </List.Section>
            );
          })
      )}
    </List>
  );
}
