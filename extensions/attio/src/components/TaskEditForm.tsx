import { failToast } from "@chrismessina/raycast-kit";
import { Action, ActionPanel, Alert, confirmAlert, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { createTask, deleteTask, updateTask } from "../api/endpoints";
import type { Task } from "../api/types";

type FormValues = {
  content: string;
  deadline_at: Date | null;
  is_completed: boolean;
};

/**
 * Attio's API can't edit task text (spec round-4c §1): a deadline/completed-only
 * change is a plain PATCH, but a content change requires deleting the task and
 * creating a new one, which the user must confirm since it changes the task's
 * ID and creator.
 */
export default function TaskEditForm({ task }: { task: Task }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const contentChanged = values.content !== task.content_plaintext;
      const deadline_at = values.deadline_at ? values.deadline_at.toISOString() : null;

      if (!contentChanged) {
        const toast = await showToast(Toast.Style.Animated, "Updating");
        try {
          await updateTask(task.id.task_id, { is_completed: values.is_completed, deadline_at });
          toast.style = Toast.Style.Success;
          toast.title = "Updated";
          pop();
        } catch (error) {
          failToast(toast, error, { title: "Failed" });
        }
        return;
      }

      const ok = await confirmAlert({
        title: "Recreate this task?",
        message:
          "Attio's API can't edit task text. Saving will delete this task and create a new one with your text — it gets a new ID and shows the API token as creator. Links, assignees, deadline, and completion carry over.",
        primaryAction: { title: "Recreate", style: Alert.ActionStyle.Destructive },
      });
      if (!ok) return;

      const toast = await showToast(Toast.Style.Animated, "Recreating");
      try {
        await createTask({
          content: values.content,
          format: "plaintext",
          deadline_at,
          is_completed: values.is_completed,
          linked_records: task.linked_records.map((l) => ({
            target_object: l.target_object_id,
            target_record_id: l.target_record_id,
          })),
          assignees: task.assignees.map((a) => ({
            referenced_actor_type: "workspace-member",
            referenced_actor_id: a.referenced_actor_id,
          })),
        });
        try {
          await deleteTask(task.id.task_id);
        } catch (deleteError) {
          failToast(toast, deleteError, {
            title: "Created the new task but couldn't delete the old one — delete it in Attio",
          });
          pop();
          return;
        }
        toast.style = Toast.Style.Success;
        toast.title = "Task recreated";
        pop();
      } catch (error) {
        failToast(toast, error, { title: "Failed" });
      }
    },
    initialValues: {
      content: task.content_plaintext,
      deadline_at: task.deadline_at ? new Date(task.deadline_at) : null,
      is_completed: task.is_completed,
    },
    validation: {
      content: (v) => (v?.trim() ? undefined : "Task content is required"),
    },
  });
  return (
    <Form
      navigationTitle={`Tasks / ${task.id.task_id} / Edit`}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Save Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Content" {...itemProps.content} />
      <Form.DatePicker title="Deadline" {...itemProps.deadline_at} />
      <Form.Checkbox label="Completed" {...itemProps.is_completed} />
    </Form>
  );
}
