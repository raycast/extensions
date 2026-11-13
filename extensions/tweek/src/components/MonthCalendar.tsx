import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Grid,
  Icon,
  Keyboard,
  useNavigation,
} from "@raycast/api";
import React, { useCallback, useMemo, useState } from "react";
import { useTasks } from "../hooks/useTasks";
import {
  DateFormatPreference,
  TaskFilterState,
  TweekCalendar,
  TweekCustomColor,
  WeekStartPreference,
} from "../types";
import {
  addMonthsISO,
  formatRelativeTaskDate,
  getMonthGridISO,
  getMonthStartISO,
  getTodayISO,
  parseISODate,
} from "../utils/date-utils";
import {
  groupTasksByDate,
  renderDayCellSvg,
  svgToDataUri,
} from "../utils/month-calendar";
import { TaskForm } from "./TaskForm";
import { TaskList } from "./TaskList";

interface DayTasksViewProps {
  date: string;
  calendars: TweekCalendar[];
  initialCalendarId: string;
  customColors: TweekCustomColor[];
  /** Same fetch window as the month grid so the shared task cache is reused. */
  windowFrom: string;
  windowTo: string;
}

/** Full task management (edit, complete, delete, bulk…) for a single day. */
function DayTasksView({
  date,
  calendars,
  initialCalendarId,
  customColors,
  windowFrom,
  windowTo,
}: DayTasksViewProps) {
  const prefs = getPreferenceValues<Preferences>();
  const dateFormat: DateFormatPreference = prefs.dateFormat || "dd/MM/yyyy";
  const [calendarId, setCalendarId] = useState<string>(initialCalendarId);
  const activeCalendar =
    calendars.find((c) => c.id === calendarId) ?? calendars[0];

  const {
    tasks,
    isLoading,
    isOffline,
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
    calendarId,
    calendar: activeCalendar,
    dateFrom: windowFrom,
    dateTo: windowTo,
    includeSomedayLists: false,
  });

  const [filter, setFilter] = useState<TaskFilterState>({
    searchText: "",
    calendarId,
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
      calendarId,
      datePreset: "all",
      colorFilter: "all",
      hideCompleted: Boolean(prefs.hideCompleted),
      somedayListId: "all",
    });
  }, [calendarId, prefs.hideCompleted]);

  const dayTasks = useMemo(
    () => tasks.filter((task) => task.date === date),
    [tasks, date],
  );

  return (
    <TaskList
      navigationTitle={formatRelativeTaskDate(date, dateFormat)}
      calendars={calendars}
      activeCalendarId={calendarId}
      activeCalendar={activeCalendar}
      customColors={customColors}
      tasks={dayTasks}
      isLoading={isLoading}
      isOffline={isOffline}
      filter={filter}
      selectedTaskIds={selectedTaskIds}
      defaultDate={date}
      onSelectCalendar={(calId) => {
        setCalendarId(calId);
        handleUpdateFilter({ calendarId: calId, somedayListId: "all" });
      }}
      onUpdateFilter={handleUpdateFilter}
      onResetFilters={handleResetFilters}
      onRefresh={refreshTasks}
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

export interface MonthCalendarViewProps {
  calendars: TweekCalendar[];
  initialCalendarId: string;
  customColors: TweekCustomColor[];
  /** Show a loading indicator while calendars are still being fetched. */
  isLoadingCalendars?: boolean;
  /** When provided, a "Show Task List" action switches back to the list view for the selected calendar. */
  onShowTaskList?: (calendarId: string) => void;
  /** Callback fired whenever the user changes the active calendar in the dropdown. */
  onCalendarChange?: (calendarId: string) => void;
}

/**
 * Monthly calendar grid. Every day cell shows the day number and a dot per
 * task (colored by badge). Press Enter on a day to manage its tasks.
 */
export function MonthCalendarView({
  calendars,
  initialCalendarId,
  customColors,
  isLoadingCalendars = false,
  onShowTaskList,
  onCalendarChange,
}: MonthCalendarViewProps) {
  const { push } = useNavigation();
  const prefs = getPreferenceValues<Preferences>();
  const weekStartsOn: WeekStartPreference = prefs.weekStartsOn || "Monday";
  const todayISO = getTodayISO();

  // Falls back to the initial calendar, which may only resolve after calendars load.
  const [selectedCalendarId, setCalendarId] = useState<string | null>(null);
  const calendarId = selectedCalendarId ?? initialCalendarId;
  const [viewMonth, setViewMonth] = useState<string>(
    getMonthStartISO(todayISO),
  );
  const [selectedISO, setSelectedISO] = useState<string>(todayISO);
  const [hideCompleted, setHideCompleted] = useState<boolean>(
    Boolean(prefs.hideCompleted),
  );

  const activeCalendar =
    calendars.find((c) => c.id === calendarId) ?? calendars[0];

  const gridDays = useMemo(
    () => getMonthGridISO(viewMonth, weekStartsOn),
    [viewMonth, weekStartsOn],
  );
  const windowFrom = gridDays[0];
  const windowTo = gridDays[gridDays.length - 1];

  const { tasks, isLoading, isOffline, refreshTasks, createTask } = useTasks({
    calendarId,
    calendar: activeCalendar,
    dateFrom: windowFrom,
    dateTo: windowTo,
    includeSomedayLists: false,
  });

  const tasksByDate = useMemo(
    () =>
      groupTasksByDate(hideCompleted ? tasks.filter((t) => !t.done) : tasks),
    [tasks, hideCompleted],
  );

  const monthPrefix = viewMonth.slice(0, 7);
  const monthTaskCount = useMemo(() => {
    let count = 0;
    for (const [date, list] of tasksByDate) {
      if (date.startsWith(monthPrefix)) count += list.length;
    }
    return count;
  }, [tasksByDate, monthPrefix]);

  const monthLabel = parseISODate(viewMonth).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const cells = useMemo(
    () =>
      gridDays.map((iso, index) => {
        const options = {
          dayNumber: Number(iso.slice(8, 10)),
          tasks: tasksByDate.get(iso) ?? [],
          customColors,
          inMonth: iso.startsWith(monthPrefix),
          isToday: iso === todayISO,
          weekdayLabel:
            index < 7
              ? parseISODate(iso).toLocaleDateString("en-US", {
                  weekday: "short",
                })
              : undefined,
        };
        return {
          iso,
          light: svgToDataUri(renderDayCellSvg({ ...options, theme: "light" })),
          dark: svgToDataUri(renderDayCellSvg({ ...options, theme: "dark" })),
        };
      }),
    [gridDays, tasksByDate, customColors, monthPrefix, todayISO],
  );

  const goToMonth = (offset: number) => {
    const nextMonth = getMonthStartISO(addMonthsISO(viewMonth, offset));
    setViewMonth(nextMonth);
    setSelectedISO(
      todayISO.startsWith(nextMonth.slice(0, 7)) ? todayISO : nextMonth,
    );
  };

  const goToToday = () => {
    setViewMonth(getMonthStartISO(todayISO));
    setSelectedISO(todayISO);
  };

  const openCreateForm = (isoDate: string) => {
    push(
      <TaskForm
        mode="create"
        isPushed={true}
        navigationTitle="Create Tweek Task"
        initialDate={isoDate}
        calendars={calendars}
        defaultCalendarId={calendarId}
        customColors={customColors}
        onSubmitCreate={createTask}
      />,
    );
  };

  const title = isOffline ? `${monthLabel} (Offline Cache)` : monthLabel;

  return (
    <Grid
      columns={7}
      aspectRatio="4/3"
      fit={Grid.Fit.Fill}
      isLoading={isLoading || isLoadingCalendars}
      navigationTitle={title}
      filtering={false}
      selectedItemId={selectedISO}
      onSelectionChange={(id) => {
        if (id) setSelectedISO(id);
      }}
      searchBarPlaceholder="⌘[ previous month · ⌘] next month · ⌘T today"
      searchBarAccessory={
        calendars.length > 1 ? (
          <Grid.Dropdown
            tooltip="Calendar"
            value={calendarId}
            onChange={(calId) => {
              setCalendarId(calId);
              onCalendarChange?.(calId);
            }}
          >
            {calendars.map((cal) => (
              <Grid.Dropdown.Item
                key={cal.id}
                title={cal.name}
                value={cal.id}
              />
            ))}
          </Grid.Dropdown>
        ) : undefined
      }
    >
      <Grid.Section
        title={monthLabel}
        subtitle={`${monthTaskCount} ${monthTaskCount === 1 ? "task" : "tasks"}`}
      >
        {cells.map((cell) => (
          <Grid.Item
            key={cell.iso}
            id={cell.iso}
            content={{ source: { light: cell.light, dark: cell.dark } }}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Day">
                  <Action.Push
                    title="View Day Tasks"
                    icon={Icon.List}
                    onPop={refreshTasks}
                    target={
                      <DayTasksView
                        date={cell.iso}
                        calendars={calendars}
                        initialCalendarId={calendarId}
                        customColors={customColors}
                        windowFrom={windowFrom}
                        windowTo={windowTo}
                      />
                    }
                  />
                  <Action
                    title="Create Task on This Day"
                    icon={Icon.Plus}
                    shortcut={Keyboard.Shortcut.Common.New}
                    onAction={() => openCreateForm(cell.iso)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Navigate">
                  <Action
                    title="Next Month"
                    icon={Icon.ArrowRight}
                    shortcut={{ modifiers: ["cmd"], key: "]" }}
                    onAction={() => goToMonth(1)}
                  />
                  <Action
                    title="Previous Month"
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: ["cmd"], key: "[" }}
                    onAction={() => goToMonth(-1)}
                  />
                  <Action
                    title="Go to Today"
                    icon={{ source: Icon.Calendar, tintColor: Color.Red }}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                    onAction={goToToday}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="View">
                  {onShowTaskList && (
                    <Action
                      title="Show Task List"
                      icon={Icon.List}
                      shortcut={{ modifiers: ["cmd", "opt"], key: "l" }}
                      onAction={() => onShowTaskList(calendarId)}
                    />
                  )}
                  <Action
                    title={
                      hideCompleted
                        ? "Show Completed Tasks"
                        : "Hide Completed Tasks"
                    }
                    icon={hideCompleted ? Icon.Eye : Icon.EyeDisabled}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                    onAction={() => setHideCompleted((v) => !v)}
                  />
                  <Action
                    title="Refresh Tasks"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={refreshTasks}
                  />
                  <Action.OpenInBrowser
                    title="Open Calendar in Tweek"
                    url="https://tweek.so"
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </Grid.Section>
    </Grid>
  );
}
