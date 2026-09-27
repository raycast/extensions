import { getPreferenceValues } from "@raycast/api";
import React, { useCallback, useMemo, useState } from "react";
import { TaskList } from "../components/TaskList";
import { useCalendars } from "../hooks/useCalendars";
import { useTasks } from "../hooks/useTasks";
import { TaskFilterState } from "../types";
import { addDaysISO, getTodayISO } from "../utils/date-utils";

export default function SearchTasksCommand() {
  const prefs = getPreferenceValues<Preferences>();

  // 90-day window (within Tweek's 92-day occurrence expansion limit)
  const searchWindow = useMemo(() => {
    const today = getTodayISO();
    return {
      dateFrom: addDaysISO(today, -30),
      dateTo: addDaysISO(today, 60),
    };
  }, []);

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
    dateFrom: searchWindow.dateFrom,
    dateTo: searchWindow.dateTo,
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

  return (
    <TaskList
      navigationTitle={
        activeCalendar
          ? `Search Tweek Tasks — ${activeCalendar.name}`
          : "Search Tweek Tasks"
      }
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
    />
  );
}
