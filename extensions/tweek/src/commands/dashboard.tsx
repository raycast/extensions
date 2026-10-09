import { getPreferenceValues, useNavigation } from "@raycast/api";
import React, { useCallback, useState } from "react";
import { MonthCalendarView } from "../components/MonthCalendar";
import { TaskList } from "../components/TaskList";
import { useCalendars } from "../hooks/useCalendars";
import { useTasks } from "../hooks/useTasks";
import { TaskFilterState } from "../types";

/** Classic task-list dashboard (grouped by Overdue / Today / This Week…). */
function TaskListDashboard() {
  const prefs = getPreferenceValues<Preferences>();
  const { push } = useNavigation();

  const {
    calendars,
    customColors,
    activeCalendarId,
    setActiveCalendarId,
    activeCalendar,
    isLoading: isCalendarsLoading,
    isOffline: isCalendarsOffline,
    refreshCalendars,
  } = useCalendars();

  const {
    tasks,
    isLoading: isTasksLoading,
    isOffline: isTasksOffline,
    refreshTasks,
    createTask,
    bulkCreate,
    updateTask,
    toggleComplete,
    deleteTask,
    selectedTaskIds,
    toggleTaskSelection,
    selectAllVisible,
    clearSelection,
    bulkComplete,
    bulkUpdate,
    bulkDelete,
  } = useTasks({
    calendarId: activeCalendarId,
    calendar: activeCalendar,
    includeSomedayLists: true,
  });

  const [filter, setFilter] = useState<TaskFilterState>({
    searchText: "",
    calendarId: activeCalendarId,
    datePreset: "all",
    colorFilter: "all",
    hideCompleted: Boolean(prefs.hideCompleted),
    somedayListId: "all",
  });

  const handleUpdateFilter = useCallback((patch: Partial<TaskFilterState>) => {
    setFilter((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilter({
      searchText: "",
      calendarId: activeCalendarId,
      datePreset: "all",
      colorFilter: "all",
      hideCompleted: Boolean(prefs.hideCompleted),
      somedayListId: "all",
    });
  }, [activeCalendarId, prefs.hideCompleted]);

  const handleRefreshAll = useCallback(async () => {
    await Promise.all([refreshCalendars(), refreshTasks()]);
  }, [refreshCalendars, refreshTasks]);

  const handleOpenMonthView = useCallback(() => {
    push(
      <MonthCalendarView
        calendars={calendars}
        initialCalendarId={activeCalendarId}
        customColors={customColors}
      />,
    );
  }, [push, calendars, activeCalendarId, customColors]);

  return (
    <TaskList
      calendars={calendars}
      activeCalendarId={activeCalendarId}
      activeCalendar={activeCalendar}
      customColors={customColors}
      tasks={tasks}
      isLoading={isCalendarsLoading || isTasksLoading}
      isOffline={isCalendarsOffline || isTasksOffline}
      filter={filter}
      selectedTaskIds={selectedTaskIds}
      onSelectCalendar={(calId) => {
        setActiveCalendarId(calId);
        handleUpdateFilter({ calendarId: calId, somedayListId: "all" });
      }}
      onUpdateFilter={handleUpdateFilter}
      onResetFilters={handleResetFilters}
      onRefresh={handleRefreshAll}
      onCreateTask={createTask}
      onBulkCreateTasks={bulkCreate}
      onUpdateTask={updateTask}
      onToggleComplete={toggleComplete}
      onDeleteTask={deleteTask}
      onToggleSelectTask={toggleTaskSelection}
      onSelectAllVisible={selectAllVisible}
      onClearSelection={clearSelection}
      onBulkComplete={bulkComplete}
      onBulkUpdate={bulkUpdate}
      onBulkDelete={bulkDelete}
      onOpenMonthView={handleOpenMonthView}
    />
  );
}

/** Monthly calendar as the dashboard's root view (see `defaultToMonthView`). */
function MonthDashboard({ onShowTaskList }: { onShowTaskList: () => void }) {
  const { calendars, customColors, activeCalendarId, isLoading } =
    useCalendars();

  return (
    <MonthCalendarView
      calendars={calendars}
      initialCalendarId={activeCalendarId}
      customColors={customColors}
      isLoadingCalendars={isLoading}
      onShowTaskList={onShowTaskList}
    />
  );
}

export default function DashboardCommand() {
  const prefs = getPreferenceValues<Preferences>();
  const [view, setView] = useState<"month" | "list">(
    prefs.defaultToMonthView ? "month" : "list",
  );

  return view === "month" ? (
    <MonthDashboard onShowTaskList={() => setView("list")} />
  ) : (
    <TaskListDashboard />
  );
}
