import { Action, ActionPanel, Form, showHUD, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useCachedPromise, useForm } from "@raycast/utils";
import { List, saveTask, Tag, tagOptions, Task, taskToValues, TaskValues, twoDo } from "./2do";

// Creates a task, or edits `task` when given.
export function TaskForm({ task, onSaved }: { task?: Task; onSaved?: () => void }) {
  const { pop } = useNavigation();
  const lists = useCachedPromise(() => twoDo<{ list: List[] }>("list_lists").then((r) => r.list));
  const tags = useCachedPromise(() => twoDo<{ tags: Tag[] }>("list_tags").then((r) => r.tags));

  const { handleSubmit, itemProps } = useForm<TaskValues>({
    initialValues: task && taskToValues(task),
    validation: { title: FormValidation.Required },
    async onSubmit(v) {
      try {
        await saveTask(v, task);
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
      isLoading={lists.isLoading || tags.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={task ? "Save Task" : "Add Task"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="Task" {...itemProps.title} />
      <Form.TextArea title="Notes" {...itemProps.notes} />
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
