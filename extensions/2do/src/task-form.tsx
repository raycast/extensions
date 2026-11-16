import { Action, ActionPanel, Form, showHUD, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useCachedPromise, useForm } from "@raycast/utils";
import {
  ACTIONS,
  actionValueError,
  List,
  repeatValueError,
  repeatValues,
  saveTask,
  Tag,
  tagOptions,
  Task,
  taskToValues,
  TaskValues,
  twoDo,
  WEEKDAYS,
} from "./2do";
import { PageInfo } from "./link";

const capitalize = (s: string) => s.slice(0, 1).toUpperCase() + s.slice(1);
const ORDINALS = [
  ["1", "First"],
  ["2", "Second"],
  ["3", "Third"],
  ["4", "Fourth"],
  ["5", "Fifth"],
  ["-1", "Last"],
];

// Creates a task, or edits `task` when given. `link` prefills a new task from a web page, with
// the page as the task's link.
export function TaskForm({
  task,
  link,
  onSaved,
}: {
  task?: Task;
  link?: PageInfo & { url: string };
  onSaved?: () => void;
}) {
  const { pop } = useNavigation();
  const lists = useCachedPromise(() => twoDo<{ list: List[] }>("list_lists").then((r) => r.list));
  const tags = useCachedPromise(() => twoDo<{ tags: Tag[] }>("list_tags").then((r) => r.tags));

  const { handleSubmit, itemProps, values } = useForm<TaskValues>({
    initialValues: task
      ? { ...taskToValues(task), new_tags: "" }
      : {
          new_tags: "",
          action_type: link ? "url" : "none",
          action_value: link?.url ?? "",
          ...repeatValues(),
          ...(link && { title: link.title, notes: link.description }),
        },
    validation: {
      title: FormValidation.Required,
      action_value: (v): string | undefined => actionValueError(values.action_type, v),
      repeat_interval: (v): string | undefined =>
        repeats && values.repeat === "custom" ? repeatValueError("interval", v) : undefined,
      repeat_count: (v): string | undefined =>
        repeats && values.repeat_end === "after_count" ? repeatValueError("count", v) : undefined,
      repeat_until: (v): string | undefined =>
        repeats && values.repeat_end === "on_date" && !v ? "Required" : undefined,
    },
    async onSubmit(v) {
      try {
        // Compare with the task as it is now, not as the list loaded it: an action or list changed in
        // 2Do since still counts as changed when the form sets it back.
        const current = task && (await twoDo<{ task: Task }>("get_task", { task_id: task.task_id })).task;
        await saveTask(v, current);
        if (task) {
          await showToast({ style: Toast.Style.Success, title: "Task updated" });
          onSaved?.();
          pop();
        } else {
          await showHUD(`Added "${v.title}" to 2Do`);
        }
      } catch (error) {
        await showFailureToast(error, { title: task ? "Could not update task" : "Could not add task" });
      }
    },
  });

  const repeats = !!values.is_repeating && values.repeat !== undefined;

  return (
    <Form
      navigationTitle={task ? "Edit Task" : undefined}
      isLoading={lists.isLoading || tags.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={task ? "Save Task" : "Add Task"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="Task" {...itemProps.title} />
      <Form.TextArea title="Notes" placeholder="Notes" {...itemProps.notes} />
      {values.action_type !== undefined && (
        <Form.Dropdown title="Action" {...itemProps.action_type}>
          <Form.Dropdown.Item value="none" title="None" />
          {Object.entries(ACTIONS).map(([type, a]) => (
            <Form.Dropdown.Item key={type} value={type} title={a.title} />
          ))}
        </Form.Dropdown>
      )}
      {values.action_type && values.action_type !== "none" && (
        <Form.TextField
          title={ACTIONS[values.action_type].label}
          placeholder={ACTIONS[values.action_type].placeholder}
          {...itemProps.action_value}
        />
      )}
      <Form.Separator />
      <Form.Dropdown title="List" storeValue={!task} {...itemProps.list_id}>
        {lists.data?.map((l) => (
          <Form.Dropdown.Item key={l.list_id} value={l.list_id} title={l.title} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.DatePicker title="Start" {...itemProps.start} />
      <Form.DatePicker title="Due" {...itemProps.due} />
      {values.repeat !== undefined && (
        <Form.Checkbox
          label="Repeat"
          info="Without a start or due date, the task starts today."
          {...itemProps.is_repeating}
        />
      )}
      {repeats && (
        <Form.Dropdown title="Repeats" {...itemProps.repeat}>
          <Form.Dropdown.Item value="daily" title="Daily" />
          <Form.Dropdown.Item value="weekdays" title="Weekdays" />
          <Form.Dropdown.Item value="weekly" title="Weekly" />
          <Form.Dropdown.Item value="monthly" title="Monthly" />
          <Form.Dropdown.Item value="yearly" title="Yearly" />
          <Form.Dropdown.Item value="custom" title="Custom" />
        </Form.Dropdown>
      )}
      {repeats && values.repeat === "custom" && (
        <>
          <Form.TextField title="Every" placeholder="2" {...itemProps.repeat_interval} />
          <Form.Dropdown title="Unit" {...itemProps.repeat_unit}>
            <Form.Dropdown.Item value="day" title="Days" />
            <Form.Dropdown.Item value="week" title="Weeks" />
            <Form.Dropdown.Item value="month" title="Months" />
            <Form.Dropdown.Item value="year" title="Years" />
          </Form.Dropdown>
        </>
      )}
      {repeats && values.repeat === "weekly" && (
        <Form.TagPicker title="On" placeholder="The date's weekday" {...itemProps.repeat_days}>
          {WEEKDAYS.map((d) => (
            <Form.TagPicker.Item key={d} value={d} title={capitalize(d)} />
          ))}
        </Form.TagPicker>
      )}
      {repeats && values.repeat === "monthly" && (
        <Form.Dropdown title="On" {...itemProps.repeat_ordinal}>
          <Form.Dropdown.Item value="" title="The Date's Day of the Month" />
          {ORDINALS.map(([value, title]) => (
            <Form.Dropdown.Item key={value} value={value} title={`The ${title}`} />
          ))}
        </Form.Dropdown>
      )}
      {repeats && values.repeat === "monthly" && values.repeat_ordinal && (
        <Form.Dropdown title="Weekday" {...itemProps.repeat_weekday}>
          {WEEKDAYS.map((d) => (
            <Form.Dropdown.Item key={d} value={d} title={capitalize(d)} />
          ))}
        </Form.Dropdown>
      )}
      {repeats && (
        <>
          <Form.Dropdown title="Repeat From" {...itemProps.repeat_from}>
            <Form.Dropdown.Item value="due_date" title="Due Date" />
            <Form.Dropdown.Item value="completion" title="Completion Date" />
          </Form.Dropdown>
          <Form.Dropdown title="Ends" {...itemProps.repeat_end}>
            <Form.Dropdown.Item value="never" title="Never" />
            <Form.Dropdown.Item value="after_count" title="After a Number of Times" />
            <Form.Dropdown.Item value="on_date" title="On a Date" />
          </Form.Dropdown>
          {values.repeat_end === "after_count" && (
            <Form.TextField title="Times" placeholder="10" {...itemProps.repeat_count} />
          )}
          {values.repeat_end === "on_date" && (
            <Form.DatePicker title="End Date" type={Form.DatePicker.Type.Date} {...itemProps.repeat_until} />
          )}
        </>
      )}
      <Form.Separator />
      <Form.Dropdown title="Priority" {...itemProps.priority}>
        <Form.Dropdown.Item value="none" title="None" />
        <Form.Dropdown.Item value="low" title="Low" />
        <Form.Dropdown.Item value="medium" title="Medium" />
        <Form.Dropdown.Item value="high" title="High" />
      </Form.Dropdown>
      <Form.Checkbox label="Starred" {...itemProps.starred} />
      <Form.Separator />
      <Form.TagPicker title="Tags" {...itemProps.tag_ids}>
        {tagOptions(tags.data, task).map((t) => (
          <Form.TagPicker.Item key={t.tag_id} value={t.tag_id} title={t.title} />
        ))}
      </Form.TagPicker>
      <Form.TextField
        title="New Tags"
        placeholder="Errands, Home"
        info="Comma-separated. Names matching an existing tag use that tag; the rest are created when you save."
        {...itemProps.new_tags}
      />
    </Form>
  );
}
