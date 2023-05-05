import {
  Action,
  ActionPanel,
  Form,
  Icon,
  launchCommand,
  LaunchType,
  openExtensionPreferences,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { timeTracker } from "../api/time-tracker";
import {
  createTodo,
  enabledAction,
  getThingsMoveDestiationLists,
  primaryTodoSourceId,
  priorityNameAndColor,
  TodoFormData,
  todoSourceApplicationName,
  todoSourceId,
} from "../api/todo-source";
import { callFunctionShowingToasts, toTimeEntryValues, updateTimeEntry } from "../helpers/actions";
import { now } from "../helpers/datetime";
import { todoGroupIcon } from "../helpers/todoListIcons";
import { TimeEntry, TodoGroup, TodoSourceId, TodoTag } from "../types";

export interface TodoFormValues {
  title: string;
  startDate: Date | null; // Form.DatePicker returns `null` for "No Date"
  dueDate: Date | null; // Form.DatePicker returns `null` for "No Date"
  priority: string | undefined;
  groupString: string; // JSON.stringify({ type, id, title })
  tagStrings: string[]; // JSON.stringify({ id, name }); Form.TagPicker returns [], not `null`.
  notes: string; // Form.TextArea returns "", not `null`.
}

export function CreateTodoForm({
  isFromTodayList,
  initialTitle,
  draftValues,
  enableDrafts,
  tieredTodoGroups,
  todoTags,
  revalidateTodos,
  revalidateTimeEntries,
  resetList,
}: {
  isFromTodayList: boolean;
  initialTitle?: string;
  draftValues?: TodoFormValues;
  enableDrafts?: boolean;
  tieredTodoGroups: Map<TodoSourceId, TodoGroup[]> | undefined;
  todoTags: Map<TodoSourceId, Map<string, string>> | undefined;
  revalidateTodos: (sourceId?: TodoSourceId) => Promise<void>;
  revalidateTimeEntries?: (() => Promise<TimeEntry[]>) | (() => void);
  resetList?: () => void;
}) {
  const { pop } = useNavigation();

  const initalStartDate = isFromTodayList ? now : null;

  const { handleSubmit, itemProps, focus, reset } = useForm<TodoFormValues>({
    async onSubmit({ title, startDate, dueDate, priority, groupString, tagStrings, notes }) {
      // NOTE ON THINGS: Some value combinations are incompatible, e.g., neither "Inbox" nor "Someday" should be
      // selected when `startDate` is set, "Someday" cannot be selected when `dueDate` is set, but validation isn't
      // necessary since Things will sort it out rather than throwing an error.
      const formData: TodoFormData = {
        title,
        startDate: startDate ?? (revalidateTimeEntries ? new Date() : null),
        dueDate,
        priority: priority ? parseInt(priority) : undefined,
        group: JSON.parse(groupString) as TodoFormData["group"],
        tags: tagStrings.map((tagString) => JSON.parse(tagString) as TodoTag),
        notes,
      };

      await callFunctionShowingToasts({
        async fn() {
          // INBOX OR SOMEDAY SHOWS UP ONLY WHEN ACTIVATION DATE IS NULL
          const { url } = await createTodo(formData);
          await Promise.all([
            revalidateTodos(primaryTodoSourceId),

            timeTracker !== null && revalidateTimeEntries && resetList
              ? updateTimeEntry(timeTracker.startTimer(url, toTimeEntryValues(formData)), {
                  revalidateTimeEntries,
                  url,
                }).then(() => resetList())
              : Promise.resolve(),
          ]);
          if (revalidateTimeEntries) {
            pop();
          }

          return url;
        },
        initTitle: "Creating to-do",
        successTitle: "Created to-do",
        successMessage: `"${title}" added to ${formData.group.title}`,
        successPrimaryAction: (url) => ({
          title: "Open in " + todoSourceApplicationName[primaryTodoSourceId],
          shortcut: { modifiers: ["cmd"], key: "o" },
          onAction: (toast) => void Promise.all([open(url), toast.hide()]),
        }),
        successSecondaryAction: (url) => ({
          title: "Start Timer",
          shortcut: { modifiers: ["cmd"], key: "t" },
          onAction: (toast) => {
            if (timeTracker !== null) {
              void Promise.all([
                updateTimeEntry(timeTracker.startTimer(url, toTimeEntryValues(formData)), {
                  revalidateTimeEntries,
                  url,
                }).then(() => (resetList ? resetList() : undefined)),

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
        }),
        failureTitle: "Failed to create to-do",
      });

      reset({
        title: "",
        dueDate: null,
        tagStrings: [],
        notes: "",
      });
      return focus("title");
    },
    initialValues: {
      title: draftValues?.title ?? initialTitle,
      startDate: draftValues?.startDate ?? initalStartDate,
      dueDate: draftValues?.dueDate,
      groupString: draftValues?.groupString,
      notes: draftValues?.notes,
    },
    validation: {
      title: FormValidation.Required,
    },
  });

  const tags = todoTags?.get(primaryTodoSourceId);
  const priorities = priorityNameAndColor[primaryTodoSourceId];

  return (
    <Form
      enableDrafts={enableDrafts}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={"Create To-Do" + (revalidateTimeEntries ? " & Start Timer" : "")}
            icon={Icon.PlusCircleFilled}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" {...itemProps.title} />

      {enabledAction[primaryTodoSourceId].setStartDate ? (
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
        {primaryTodoSourceId === todoSourceId.things ? (
          <Form.Dropdown.Section>
            {getThingsMoveDestiationLists().map(({ type, id, title, icon }) => (
              <Form.Dropdown.Item
                key={id}
                icon={{ source: icon }}
                title={title}
                value={JSON.stringify({ type, id, title })}
              />
            ))}
          </Form.Dropdown.Section>
        ) : null}

        {tieredTodoGroups?.get(primaryTodoSourceId)?.flatMap(({ type, id, title, isLocked, subgroups }) =>
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

      {tags ? (
        <Form.TagPicker
          title="Tags"
          info={
            tags.size === 0 ? `No tags in your ${todoSourceApplicationName[primaryTodoSourceId]} database` : undefined
          }
          {...itemProps.tagStrings}
        >
          {Array.from(tags).map(([id, name]) => (
            <Form.TagPicker.Item key={id} title={name} value={JSON.stringify({ id, name })} />
          ))}
        </Form.TagPicker>
      ) : null}

      <Form.TextArea title="Notes" {...itemProps.notes} />
    </Form>
  );
}
