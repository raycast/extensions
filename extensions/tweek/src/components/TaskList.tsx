import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  List,
  useNavigation,
} from "@raycast/api";
import React, { useMemo, useState } from "react";
import {
  CreateTaskInput,
  DateFormatPreference,
  TaskFilterState,
  TweekCalendar,
  TweekCustomColor,
  TweekTask,
  UpdateTaskInput,
  UpdateType,
  WeekStartPreference,
} from "../types";
import {
  addDaysISO,
  formatRelativeTaskDate,
  formatTaskDate,
  getTodayISO,
  isInCurrentWeek,
  isOverdue,
  parseQuickAddInput,
} from "../utils/date-utils";
import {
  BUILT_IN_COLORS,
  formatTaskCopyText,
  formatTaskMarkdown,
  getChecklistProgress,
  getTaskStatusIcon,
  isRecurringTask,
  resolveTaskColor,
} from "../utils/format-task";
import { CalendarSelector } from "./CalendarSelector";
import { applyTaskFilters, FilterBar } from "./FilterBar";
import { TaskDetail, TaskItemDetailPane } from "./TaskDetail";
import { TaskForm } from "./TaskForm";

export interface TaskListProps {
  navigationTitle: string;
  calendars: TweekCalendar[];
  activeCalendarId: string;
  activeCalendar?: TweekCalendar;
  customColors: TweekCustomColor[];
  tasks: TweekTask[];
  isLoading: boolean;
  isOffline: boolean;
  filter: TaskFilterState;
  selectedTaskIds: Set<string>;
  onSelectCalendar: (calId: string) => void;
  onUpdateFilter: (patch: Partial<TaskFilterState>) => void;
  onResetFilters: () => void;
  onRefresh: () => void;
  onCreateTask: (input: CreateTaskInput) => Promise<unknown>;
  onBulkCreateTasks: (inputs: CreateTaskInput[]) => Promise<unknown>;
  onUpdateTask: (
    taskId: string,
    updates: UpdateTaskInput & { originalCalendarId?: string },
    updateType?: UpdateType,
  ) => Promise<unknown>;
  onToggleComplete: (
    task: TweekTask,
    updateType?: UpdateType,
  ) => Promise<unknown>;
  onDeleteTask: (task: TweekTask, updateType?: UpdateType) => Promise<unknown>;
  onToggleSelectTask: (taskId: string) => void;
  onSelectAllVisible: (tasks: TweekTask[]) => void;
  onClearSelection: () => void;
  onBulkComplete: (done: boolean) => Promise<unknown>;
  onBulkUpdate: (fields: UpdateTaskInput) => Promise<unknown>;
  onBulkDelete: () => Promise<unknown>;
}

export function TaskList({
  navigationTitle,
  calendars,
  activeCalendarId,
  activeCalendar,
  customColors,
  tasks,
  isLoading,
  isOffline,
  filter,
  selectedTaskIds,
  onSelectCalendar,
  onUpdateFilter,
  onResetFilters,
  onRefresh,
  onCreateTask,
  onBulkCreateTasks,
  onUpdateTask,
  onToggleComplete,
  onDeleteTask,
  onToggleSelectTask,
  onSelectAllVisible,
  onClearSelection,
  onBulkComplete,
  onBulkUpdate,
  onBulkDelete,
}: TaskListProps) {
  const { push } = useNavigation();
  const prefs = getPreferenceValues<Preferences>();
  const dateFormat: DateFormatPreference = prefs.dateFormat || "dd/MM/yyyy";
  const weekStartsOn: WeekStartPreference = prefs.weekStartsOn || "Monday";

  const [isShowingDetail, setIsShowingDetail] = useState<boolean>(false);
  const todayISO = getTodayISO();

  const filteredTasks = useMemo(
    () => applyTaskFilters(tasks, filter, weekStartsOn),
    [tasks, filter, weekStartsOn],
  );

  // Group tasks into logical Dashboard sections
  const groupedSections = useMemo(() => {
    const overdue: TweekTask[] = [];
    const today: TweekTask[] = [];
    const thisWeekUpcoming: TweekTask[] = [];
    const laterDated: TweekTask[] = [];
    const someday: TweekTask[] = [];

    const sortByDoneAndDate = (a: TweekTask, b: TweekTask) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const dateA = a.date || "9999-99-99";
      const dateB = b.date || "9999-99-99";
      return dateA.localeCompare(dateB);
    };

    for (const task of filteredTasks) {
      if (!task.date) {
        someday.push(task);
      } else if (isOverdue(task.date, task.done)) {
        overdue.push(task);
      } else if (task.date === todayISO) {
        today.push(task);
      } else if (
        task.date > todayISO &&
        isInCurrentWeek(task.date, weekStartsOn)
      ) {
        thisWeekUpcoming.push(task);
      } else {
        laterDated.push(task);
      }
    }

    overdue.sort(sortByDoneAndDate);
    today.sort(sortByDoneAndDate);
    thisWeekUpcoming.sort(sortByDoneAndDate);
    laterDated.sort(sortByDoneAndDate);
    someday.sort(sortByDoneAndDate);

    return [
      { id: "overdue", title: "Overdue", tasks: overdue },
      {
        id: "today",
        title: `Today (${formatTaskDate(todayISO, dateFormat)})`,
        tasks: today,
      },
      {
        id: "this_week",
        title: "Upcoming — This Week",
        tasks: thisWeekUpcoming,
      },
      { id: "later", title: "Later & Past Completed", tasks: laterDated },
      { id: "someday", title: "Someday Lists", tasks: someday },
    ].filter((section) => section.tasks.length > 0);
  }, [filteredTasks, todayISO, dateFormat, weekStartsOn]);

  const openCreateModal = (initialTitle = "") => {
    push(
      <TaskForm
        mode="create"
        initialTitle={initialTitle}
        calendars={calendars}
        defaultCalendarId={activeCalendarId}
        customColors={customColors}
        onSubmitCreate={onCreateTask}
        onSubmitBulkCreate={onBulkCreateTasks}
      />,
    );
  };

  const openEditModal = (task: TweekTask) => {
    push(
      <TaskForm
        mode="edit"
        initialTask={task}
        calendars={calendars}
        defaultCalendarId={activeCalendarId}
        customColors={customColors}
        onSubmitEdit={onUpdateTask}
      />,
    );
  };

  const handleQuickAddInline = async () => {
    const raw = filter.searchText.trim();
    if (!raw || !activeCalendarId) return;
    const parsed = parseQuickAddInput(raw);
    const resolvedListId =
      parsed.date === null && activeCalendar?.lists?.[0]
        ? activeCalendar.lists[0].id
        : null;
    await onCreateTask({
      calendarId: activeCalendarId,
      text: parsed.cleanText,
      date: resolvedListId ? null : parsed.date,
      listId: resolvedListId,
      color: parsed.color || prefs.defaultTaskColor || "blank",
    });
    onUpdateFilter({ searchText: "" });
  };

  const renderTaskAccessories = (task: TweekTask): List.Item.Accessory[] => {
    const accessories: List.Item.Accessory[] = [];
    const isSelected = selectedTaskIds.has(task.id);

    if (isSelected) {
      accessories.push({
        tag: { value: "Selected", color: Color.Blue },
        icon: Icon.CheckRosette,
      });
    }

    const checklistProgress = getChecklistProgress(task);
    if (checklistProgress) {
      accessories.push({
        text: checklistProgress.label,
        icon: Icon.CheckList,
        tooltip: `${checklistProgress.completed} of ${checklistProgress.total} subtasks done`,
      });
    }

    if (isRecurringTask(task)) {
      accessories.push({
        icon: { source: Icon.Repeat, tintColor: Color.SecondaryText },
        tooltip: "Recurring Task",
      });
    }

    const colorOpt = resolveTaskColor(task.color, customColors);
    if (colorOpt.id !== "blank") {
      accessories.push({
        tag: {
          value: colorOpt.label,
          color: colorOpt.raycastColor,
        },
      });
    }

    if (!isShowingDetail) {
      if (task.date) {
        const overdue = isOverdue(task.date, task.done);
        accessories.push({
          text: {
            value: formatRelativeTaskDate(task.date, dateFormat),
            color: overdue
              ? Color.Red
              : task.date === todayISO
                ? Color.Green
                : Color.SecondaryText,
          },
          icon: overdue
            ? { source: Icon.ExclamationMark, tintColor: Color.Red }
            : undefined,
        });
      } else if (task.listId && activeCalendar?.lists) {
        const listName =
          activeCalendar.lists.find((l) => l.id === task.listId)?.name ||
          "Someday";
        accessories.push({
          tag: { value: listName, color: Color.Purple },
        });
      }
    }

    return accessories;
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      navigationTitle={
        isOffline ? `${navigationTitle} (Offline Cache)` : navigationTitle
      }
      searchText={filter.searchText}
      onSearchTextChange={(text) => onUpdateFilter({ searchText: text })}
      searchBarPlaceholder="Search tasks or type to Quick Add (e.g. 'Call client @tomorrow #pink')..."
      searchBarAccessory={
        <CalendarSelector
          calendars={calendars}
          activeCalendarId={activeCalendarId}
          datePreset={filter.datePreset}
          colorFilter={filter.colorFilter}
          somedayListId={filter.somedayListId}
          customColors={customColors}
          onSelectCalendar={onSelectCalendar}
          onSelectDatePreset={(datePreset) => onUpdateFilter({ datePreset })}
          onSelectColorFilter={(colorFilter) => onUpdateFilter({ colorFilter })}
          onSelectSomedayList={(somedayListId) =>
            onUpdateFilter({ somedayListId })
          }
        />
      }
    >
      <FilterBar
        filter={filter}
        totalMatchingCount={filteredTasks.length}
        activeCalendar={activeCalendar}
        customColors={customColors}
        onUpdateFilter={onUpdateFilter}
        onResetFilters={onResetFilters}
      />

      {selectedTaskIds.size > 0 && (
        <List.Section
          title={`Bulk Selection (${selectedTaskIds.size} selected)`}
        >
          <List.Item
            id="bulk-actions-banner"
            title={`${selectedTaskIds.size} task${selectedTaskIds.size === 1 ? "" : "s"} selected for bulk action`}
            subtitle="Press Enter to complete all, or open Action Panel for color/date/delete"
            icon={{ source: Icon.CheckRosette, tintColor: Color.Blue }}
            actions={
              <ActionPanel>
                <Action
                  title={`Complete ${selectedTaskIds.size} Selected Tasks`}
                  icon={Icon.CheckCircle}
                  onAction={() => onBulkComplete(true)}
                />
                <Action
                  title={`Mark ${selectedTaskIds.size} Tasks as Pending`}
                  icon={Icon.Circle}
                  onAction={() => onBulkComplete(false)}
                />
                <ActionPanel.Submenu
                  title="Bulk Move Date…"
                  icon={Icon.Calendar}
                >
                  <Action
                    title="Move Selected to Today"
                    onAction={() => onBulkUpdate({ date: todayISO })}
                  />
                  <Action
                    title="Move Selected to Tomorrow"
                    onAction={() =>
                      onBulkUpdate({ date: addDaysISO(todayISO, 1) })
                    }
                  />
                  <Action
                    title="Move Selected to Next Week (+7 Days)"
                    onAction={() =>
                      onBulkUpdate({ date: addDaysISO(todayISO, 7) })
                    }
                  />
                </ActionPanel.Submenu>
                <ActionPanel.Submenu
                  title="Bulk Change Color Badge…"
                  icon={Icon.Swatch}
                >
                  {Object.values(BUILT_IN_COLORS).map((c) => (
                    <Action
                      key={c.id}
                      title={c.label}
                      icon={{
                        source: Icon.CircleFilled,
                        tintColor: c.raycastColor,
                      }}
                      onAction={() => onBulkUpdate({ color: c.id })}
                    />
                  ))}
                </ActionPanel.Submenu>
                <Action
                  title={`Delete ${selectedTaskIds.size} Selected Tasks`}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={onBulkDelete}
                />
                <Action
                  title="Clear Selection"
                  icon={Icon.XMarkCircle}
                  onAction={onClearSelection}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {groupedSections.map((section) => (
        <List.Section
          key={section.id}
          title={section.title}
          subtitle={`${section.tasks.length}`}
        >
          {section.tasks.map((task) => {
            const recurring = isRecurringTask(task);
            const selected = selectedTaskIds.has(task.id);

            return (
              <List.Item
                key={task.id}
                id={task.id}
                title={task.text}
                subtitle={
                  !isShowingDetail && task.note
                    ? task.note.split("\n")[0]
                    : undefined
                }
                icon={getTaskStatusIcon(task, customColors)}
                accessories={renderTaskAccessories(task)}
                detail={
                  <TaskItemDetailPane
                    task={task}
                    calendar={activeCalendar}
                    customColors={customColors}
                    dateFormat={dateFormat}
                  />
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Task Primary Actions">
                      <Action
                        title={task.done ? "Mark as Pending" : "Complete Task"}
                        icon={task.done ? Icon.Circle : Icon.CheckCircle}
                        onAction={() => onToggleComplete(task)}
                      />
                      <Action
                        title="Edit Task"
                        icon={Icon.Pencil}
                        shortcut={{ modifiers: ["cmd"], key: "e" }}
                        onAction={() => openEditModal(task)}
                      />
                      <Action
                        title="Create New Task"
                        icon={Icon.Plus}
                        shortcut={{ modifiers: ["cmd"], key: "n" }}
                        onAction={() => openCreateModal()}
                      />
                      {!recurring ? (
                        <Action
                          title="Delete Task"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          shortcut={{ modifiers: ["cmd"], key: "d" }}
                          onAction={() => onDeleteTask(task)}
                        />
                      ) : (
                        <ActionPanel.Submenu
                          title="Delete Recurring Task…"
                          icon={Icon.Trash}
                          shortcut={{ modifiers: ["cmd"], key: "d" }}
                        >
                          <Action
                            title="Delete Only This Occurrence (only_this)"
                            style={Action.Style.Destructive}
                            onAction={() => onDeleteTask(task, "only_this")}
                          />
                          <Action
                            title="Delete This & Future Occurrences (this_and_future)"
                            style={Action.Style.Destructive}
                            onAction={() =>
                              onDeleteTask(task, "this_and_future")
                            }
                          />
                          <Action
                            title="Delete All Linked Occurrences (all_linked)"
                            style={Action.Style.Destructive}
                            onAction={() => onDeleteTask(task, "all_linked")}
                          />
                        </ActionPanel.Submenu>
                      )}
                    </ActionPanel.Section>

                    {recurring && (
                      <ActionPanel.Section title="Recurring Series Management">
                        <ActionPanel.Submenu
                          title="Complete Recurring Task Scope…"
                          icon={Icon.Repeat}
                        >
                          <Action
                            title="Complete Only This Occurrence"
                            onAction={() => onToggleComplete(task, "only_this")}
                          />
                          <Action
                            title="Complete This & Future Occurrences"
                            onAction={() =>
                              onToggleComplete(task, "this_and_future")
                            }
                          />
                          <Action
                            title="Complete All Linked"
                            onAction={() =>
                              onToggleComplete(task, "all_linked")
                            }
                          />
                        </ActionPanel.Submenu>
                      </ActionPanel.Section>
                    )}

                    <ActionPanel.Section title="Quick Actions & Details">
                      <Action
                        title={
                          isShowingDetail
                            ? "Hide Split Details"
                            : "Show Split Markdown Details"
                        }
                        icon={Icon.Sidebar}
                        shortcut={{ modifiers: ["cmd"], key: "i" }}
                        onAction={() => setIsShowingDetail((v) => !v)}
                      />
                      <Action.Push
                        title="Open Full Markdown View"
                        icon={Icon.Document}
                        shortcut={{ modifiers: ["cmd"], key: "p" }}
                        target={
                          <TaskDetail
                            task={task}
                            calendar={activeCalendar}
                            customColors={customColors}
                            dateFormat={dateFormat}
                            onToggleComplete={onToggleComplete}
                            onDelete={onDeleteTask}
                          />
                        }
                      />
                      <Action.CopyToClipboard
                        title="Copy Task Description"
                        content={formatTaskCopyText(task, dateFormat)}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Task Markdown"
                        content={formatTaskMarkdown(
                          task,
                          activeCalendar,
                          customColors,
                          dateFormat,
                        )}
                      />
                      <Action.OpenInBrowser
                        title="Open Calendar in Tweek"
                        url="https://tweek.so"
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Bulk Operations & View">
                      <Action
                        title={
                          selected
                            ? "Deselect Task from Bulk Batch"
                            : "Select Task for Bulk Operation"
                        }
                        icon={selected ? Icon.XMarkCircle : Icon.CheckRosette}
                        shortcut={{ modifiers: ["cmd"], key: "b" }}
                        onAction={() => onToggleSelectTask(task.id)}
                      />
                      <Action
                        title="Select All Visible Tasks"
                        icon={Icon.CheckList}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                        onAction={() => onSelectAllVisible(filteredTasks)}
                      />
                      {selectedTaskIds.size > 0 && (
                        <Action
                          title="Clear Bulk Selection"
                          icon={Icon.XMarkCircle}
                          onAction={onClearSelection}
                        />
                      )}
                      <Action
                        title={
                          filter.hideCompleted
                            ? "Show Completed Tasks"
                            : "Hide Completed Tasks"
                        }
                        icon={
                          filter.hideCompleted ? Icon.Eye : Icon.EyeDisabled
                        }
                        shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                        onAction={() =>
                          onUpdateFilter({
                            hideCompleted: !filter.hideCompleted,
                          })
                        }
                      />
                      <Action
                        title="Refresh Tasks & Cache"
                        icon={Icon.ArrowClockwise}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                        onAction={onRefresh}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}

      {filter.searchText.trim().length > 0 && (
        <List.Section title="Quick Add">
          <List.Item
            id="quick-add-inline-row"
            title={`Quick Add: "${filter.searchText.trim()}"`}
            subtitle={`Add to ${activeCalendar?.name || "Calendar"} (supports @today @tomorrow #pink)`}
            icon={{ source: Icon.PlusCircleFilled, tintColor: Color.Green }}
            actions={
              <ActionPanel>
                <Action
                  title={`Quick Add "${filter.searchText.trim()}"`}
                  icon={Icon.Plus}
                  onAction={handleQuickAddInline}
                />
                <Action
                  title="Open Detailed Create Form…"
                  icon={Icon.AppWindowList}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() => openCreateModal(filter.searchText.trim())}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {!isLoading && filteredTasks.length === 0 && (
        <List.EmptyView
          title="No Tasks Found"
          description={
            filter.searchText.trim()
              ? `Press Enter to Quick Add "${filter.searchText.trim()}", or press ⌘+N to open the Create Task form.`
              : "Your Tweek schedule is clear for this filter. Press ⌘+N to create a new task."
          }
          icon={Icon.CheckRosette}
          actions={
            <ActionPanel>
              {filter.searchText.trim() && (
                <Action
                  title={`Quick Add "${filter.searchText.trim()}"`}
                  icon={Icon.Plus}
                  onAction={handleQuickAddInline}
                />
              )}
              <Action
                title="Create New Task"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() => openCreateModal(filter.searchText.trim())}
              />
              <Action
                title="Reset Filters"
                icon={Icon.RotateAntiClockwise}
                onAction={onResetFilters}
              />
              <Action
                title="Refresh from Tweek"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={onRefresh}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
