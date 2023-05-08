import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, MutatePromise, useForm } from "@raycast/utils";
import { isSameDay } from "date-fns";
import { useEffect } from "react";
import { updateBlockTitles } from "../api/eventkit";
import { timeEntryIdStorage, timeTracker } from "../api/time-tracker";
import {
  enabledAction,
  getThingsMoveDestiationLists,
  getURLs,
  NO_AREA_PROJECT_VALUE,
  priorityNameAndColor,
  TodoFormData,
  todoSourceApplicationName,
  todoSourceId,
  updateTodo,
} from "../api/todo-source";
import { callFunctionShowingToasts, toTimeEntryValues, updateTimeEntry } from "../helpers/actions";
import { fourteenDayInterval } from "../helpers/datetime";
import { TodoItem } from "../helpers/todoList";
import { todoGroupIcon } from "../helpers/todoListIcons";
import useDetailedTodo from "../hooks/useDetailedTodo";
import { CalendarEvent, TimeEntry, TodoGroup, TodoSourceId, TodoTag } from "../types";
import { TodoFormValues } from "./CreateTodoForm";

const { blockCalendar } = getPreferenceValues<{ blockCalendar: string }>();

function isEqual(oldValue: string | null | undefined, newValue: string | null): boolean;
function isEqual(oldValue: number | undefined, newValue: number | undefined): boolean;
function isEqual(oldValue: Date | null | undefined, newValue: Date | null): boolean;
function isEqual(
  oldValue: string | number | Date | null | undefined,
  newValue: string | number | Date | null | undefined
): boolean {
  // Treats `null` as equal to an empty string ("") for `notes`
  return (
    (!oldValue && !newValue) ||
    (oldValue instanceof Date && newValue instanceof Date ? isSameDay(oldValue, newValue) : oldValue === newValue)
  );
}

export default function EditTodoForm({
  todoItem,
  tieredTodoGroups,
  todoTags,
  revalidateTodos,
  revalidateUpcomingEvents,
  revalidateTimeEntries,
  mutateTimeEntries,
}: {
  todoItem: TodoItem;
  tieredTodoGroups: TodoGroup[] | undefined;
  todoTags: Map<string, string> | undefined;
  revalidateTodos: (sourceId?: TodoSourceId) => Promise<void>;
  revalidateUpcomingEvents: (() => Promise<CalendarEvent[]>) | undefined;
  revalidateTimeEntries: (() => Promise<TimeEntry[]>) | (() => void) | undefined;
  mutateTimeEntries: MutatePromise<TimeEntry[]> | undefined;
}): JSX.Element {
  const { pop } = useNavigation();

  const { todo, isLoadingTodo } = useDetailedTodo(todoItem);

  const { handleSubmit, itemProps, setValue } = useForm<TodoFormValues>({
    async onSubmit(values) {
      const diffs: Partial<TodoFormData> = {};
      for (const key of Object.keys(values)) {
        switch (key) {
          case "title":
          case "notes":
            if (!isEqual(todo?.[key], values[key])) {
              diffs[key] = values[key];
            }
            break;
          case "startDate":
          case "dueDate":
            if (!isEqual(todo?.[key], values[key])) {
              diffs[key] = values[key];
            }
            break;
          case "priority": {
            const priorityString = values[key];
            const newValue = priorityString ? parseInt(priorityString) : undefined;
            if (!isEqual(todo?.[key], newValue)) {
              diffs[key] = newValue;
            }
            break;
          }
          case "groupString":
            if (values[key] !== NO_AREA_PROJECT_VALUE) {
              const group = JSON.parse(values[key]) as NonNullable<TodoItem["group"]>;
              if (group.type !== (todo ?? todoItem).group?.type || group.id !== (todo ?? todoItem).group?.id) {
                diffs.group = group;
              }
            }
            break;
          case "tagStrings": {
            const oldTagIds = todo?.tagIds;
            const newTags = values[key].map((tagString) => JSON.parse(tagString) as TodoTag);
            if (
              oldTagIds
                ? oldTagIds.length !== newTags.length || oldTagIds.some((elem, i) => elem !== newTags[i].id)
                : newTags.length > 0
            ) {
              diffs.tags = newTags;
            }
          }
        }
      }

      if (Object.keys(diffs).length === 0) {
        await showToast({ title: "No edits were made." });
        pop();
        return;
      }

      // For `optimisticUpdate`, retrieve IDs of the time entries recorded for this to-do.
      const joinedTimeEntryIds = diffs.title ? await timeEntryIdStorage.get(todoItem.url) : undefined;

      await callFunctionShowingToasts({
        async fn() {
          await updateTodo[todoItem.sourceId](todoItem.todoId, diffs);
          const title = diffs.title;

          await Promise.all([
            revalidateTodos(todoItem.sourceId),

            // Update time block calendar event titles.
            // `revalidateBlocks()` doesn't need to be called since their titles are not used.
            // Task block titles are used, but they aren't editable.
            // `revalidateUpcomingEvents()` needs to be called since conflicting event titles are displayed.
            title
              ? (async () => {
                  const urls = getURLs(todoItem.id);
                  await updateBlockTitles(title, urls, blockCalendar, fourteenDayInterval);
                  if (revalidateUpcomingEvents) {
                    await revalidateUpcomingEvents();
                  }
                })()
              : Promise.resolve(),

            // Update time entry titles.
            (title || diffs.group || diffs.tags) && timeTracker !== null
              ? updateTimeEntry(timeTracker.updateTimeEntries(todoItem.id, toTimeEntryValues(diffs)), {
                  optimisticUpdate(data) {
                    if (!joinedTimeEntryIds || !title) return data;
                    const timeEntryIds = joinedTimeEntryIds.split(",");
                    return data.map((entry) =>
                      timeEntryIds.includes(entry.id.toString()) ? { ...entry, title: title } : entry
                    );
                  },
                  mutateTimeEntries,
                  revalidateTimeEntries,
                })
              : Promise.resolve(),
          ]);

          pop();
        },
        initTitle: "Editing to-do",
        successTitle: "Edited to-do",
        successMessage: `"${values.title}" updated`,
        successPrimaryAction: {
          title: "Open in " + todoSourceApplicationName[todoItem.sourceId],
          shortcut: { modifiers: ["cmd"], key: "o" },
          onAction: (toast) => void Promise.all([open(todoItem.url), toast.hide()]),
        },
        successSecondaryAction: {
          title: "Start Timer",
          shortcut: { modifiers: ["cmd"], key: "t" },
          onAction: (toast) => {
            if (timeTracker !== null) {
              const dataForTimeTracker = {
                title: diffs.title ?? todoItem.title,
                group: diffs.group ?? todoItem.group ?? undefined,
                tags: diffs.tags ?? todoItem.tags,
              };
              void Promise.all([
                updateTimeEntry(timeTracker.startTimer(todoItem.url, toTimeEntryValues(dataForTimeTracker)), {
                  revalidateTimeEntries,
                }),

                toast.hide(),
              ]).then(() => launchCommand({ name: "track-time", type: LaunchType.UserInitiated }));
            } else {
              toast.title = "Time Tracker Unavailable";
              toast.message = "Check your Calendar for Time Tracking or Time Tracking App API Key settings";
              toast.style = Toast.Style.Failure;
              toast.primaryAction = {
                title: "Open Raycast Settings",
                onAction: () => void openExtensionPreferences(),
              };
              toast.secondaryAction = undefined;
            }
          },
        },
        failureTitle: "Failed to edit to-do",
      });
    },
    initialValues: {
      title: todoItem.title,
      startDate: todoItem.startDate,
      dueDate: todoItem.dueDate,
      priority: todoItem.priority?.value.toString(),
      groupString: todoItem.group ? JSON.stringify(todoItem.group) : NO_AREA_PROJECT_VALUE,
      tagStrings: todoItem.tags?.map(({ id, name }) => JSON.stringify({ id, name })),
    },
    validation: {
      title: FormValidation.Required,
    },
  });

  // Update `notes` and `checklistItems` once `detailedTodo` is fetched.
  useEffect(() => {
    if (todo?.notes) {
      setValue("notes", todo.notes);
    }
  }, [todo, setValue]);

  const priorities = priorityNameAndColor[todoItem.sourceId];

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={"Edit To-Do"} icon={Icon.Pencil} onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoadingTodo}
    >
      <Form.TextField title="Title" {...itemProps.title} />

      {enabledAction[todoItem.sourceId].setStartDate ? (
        <Form.DatePicker title="When" type={Form.DatePicker.Type.Date} {...itemProps.startDate} />
      ) : null}

      <Form.DatePicker title="Due Date" type={Form.DatePicker.Type.Date} {...itemProps.dueDate} />

      {priorities ? (
        <Form.Dropdown title="Priority" {...itemProps.priority}>
          {Object.entries(priorities).map(([value, { icon, name, color }]) => (
            <Form.Dropdown.Item key={value} icon={{ source: icon, tintColor: color }} title={name} value={value} />
          ))}
        </Form.Dropdown>
      ) : null}

      <Form.Dropdown title="Area/Project" {...itemProps.groupString}>
        {todoItem.sourceId === todoSourceId.things ? (
          <Form.Dropdown.Section>
            {getThingsMoveDestiationLists(todoItem.group).map(({ type, id, title, icon }) => (
              <Form.Dropdown.Item
                key={id}
                icon={{ source: icon }}
                title={title}
                value={JSON.stringify({ type, id, title })}
              />
            ))}
          </Form.Dropdown.Section>
        ) : null}

        {tieredTodoGroups?.flatMap(({ type, id, title, isLocked, subgroups }) =>
          subgroups ? (
            <Form.Dropdown.Section key={type + id} title={isLocked ? title : undefined}>
              {!isLocked ? (
                <Form.Dropdown.Item
                  key={type + id}
                  icon={todoGroupIcon[type]}
                  title={title}
                  value={JSON.stringify({ type, id, title })}
                />
              ) : null}

              {subgroups.map(({ type, id, title, isLocked }) =>
                !isLocked ? (
                  <Form.Dropdown.Item
                    key={type + id}
                    icon={todoGroupIcon[type]}
                    title={title}
                    value={JSON.stringify({ type, id, title })}
                  />
                ) : null
              )}
            </Form.Dropdown.Section>
          ) : !isLocked ? (
            <Form.Dropdown.Item
              key={type + id}
              icon={todoGroupIcon[type]}
              title={title}
              value={JSON.stringify({ type, id, title })}
            />
          ) : null
        )}
      </Form.Dropdown>

      {todoTags ? (
        <Form.TagPicker
          title="Tags"
          info={
            todoTags.size === 0 ? `No tags in your ${todoSourceApplicationName[todoItem.sourceId]} database` : undefined
          }
          {...itemProps.tagStrings}
        >
          {Array.from(todoTags).map(([id, name]) => (
            <Form.TagPicker.Item key={id} title={name} value={JSON.stringify({ id, name })} />
          ))}
        </Form.TagPicker>
      ) : null}

      <Form.TextArea title="Notes" {...itemProps.notes} />
    </Form>
  );
}
