import { Action, ActionPanel, Form, showHUD, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useCachedPromise, useForm } from "@raycast/utils";
import {
  ACTIONS,
  actionValueError,
  List,
  saveTask,
  Tag,
  tagOptions,
  Task,
  taskToValues,
  TaskValues,
  twoDo,
} from "./2do";
import { PageInfo } from "./link";

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
      ? taskToValues(task)
      : {
          action_type: link ? "url" : "none",
          action_value: link?.url ?? "",
          ...(link && { title: link.title, notes: link.description }),
        },
    validation: {
      title: FormValidation.Required,
      action_value: (v): string | undefined => actionValueError(values.action_type, v),
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
      <Form.Dropdown title="List" storeValue={!task} {...itemProps.list_id}>
        {lists.data?.map((l) => (
          <Form.Dropdown.Item key={l.list_id} value={l.list_id} title={l.title} />
        ))}
      </Form.Dropdown>
      <Form.DatePicker title="Start" {...itemProps.start} />
      <Form.DatePicker title="Due" {...itemProps.due} />
      <Form.Dropdown title="Priority" {...itemProps.priority}>
        <Form.Dropdown.Item value="none" title="None" />
        <Form.Dropdown.Item value="low" title="Low" />
        <Form.Dropdown.Item value="medium" title="Medium" />
        <Form.Dropdown.Item value="high" title="High" />
      </Form.Dropdown>
      <Form.Checkbox label="Starred" {...itemProps.starred} />
      <Form.TagPicker title="Tags" {...itemProps.tag_ids}>
        {tagOptions(tags.data, task).map((t) => (
          <Form.TagPicker.Item key={t.tag_id} value={t.tag_id} title={t.title} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
