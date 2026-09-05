import { Action, ActionPanel, Form, Icon, Toast, open, popToRoot, showToast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect } from "react";
import { createTask, taskUrl } from "./api/client";
import { ConnectionError } from "./components/ConnectionError";
import { toFloatingDay } from "./helpers/dates";
import { useHule } from "./hooks/useHule";
import { PRIORITIES, type Priority } from "./api/types";
import { listIcon, memberIcon, priorityIcon } from "./helpers/appearance";

interface FormValues {
  listId: string;
  title: string;
  description: string;
  priority: string;
  dueDate: Date | null;
  assigneeId: string;
}

export default function Command() {
  const { data: context, isLoading, error, revalidate } = useHule();

  const { handleSubmit, itemProps, values, setValue } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating task" });
      try {
        const task = await createTask(values.listId, {
          title: values.title.trim(),
          description: values.description.trim() || undefined,
          priority: values.priority as Priority,
          assigneeId: values.assigneeId || undefined,
          dueDate: values.dueDate ? toFloatingDay(values.dueDate) : undefined,
          allDay: true,
        });
        toast.style = Toast.Style.Success;
        toast.title = "Task created";
        toast.message = task.title;
        toast.primaryAction = {
          title: "Open in Hule",
          onAction: () => open(taskUrl(task)),
        };
        await popToRoot();
      } catch (cause) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not create the task";
        toast.message = cause instanceof Error ? cause.message : String(cause);
      }
    },
    validation: { title: FormValidation.Required, listId: FormValidation.Required },
    initialValues: { priority: "none" },
  });

  // A dropdown with no value of its own still DRAWS its first item as chosen, so
  // without this the form would look filled in and refuse to submit ("List is
  // required") on a field the user can see an answer in. The lists arrive after
  // the first render, hence the effect rather than an initial value.
  useEffect(() => {
    const first = context?.openLists[0];
    if (first && !values.listId) setValue("listId", first.id);
  }, [context, values.listId, setValue]);

  const workspaceId = context?.listOf(values.listId)?.workspaceId;
  const members = workspaceId ? (context?.membersOf(workspaceId) ?? []) : [];

  if (error) return <ConnectionError message={error.message} onRetry={revalidate} />;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown {...itemProps.listId} title="List">
        {(context?.bundle.workspaces ?? []).map((workspace) => (
          <Form.Dropdown.Section key={workspace.id} title={workspace.name}>
            {(context?.openLists ?? [])
              .filter((list) => list.workspaceId === workspace.id)
              .map((list) => (
                <Form.Dropdown.Item key={list.id} value={list.id} title={list.name} icon={listIcon(list)} />
              ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>

      <Form.TextField {...itemProps.title} title="Title" placeholder="What needs doing?" />
      <Form.TextArea {...itemProps.description} title="Description" placeholder="Optional details" />

      <Form.Dropdown {...itemProps.priority} title="Priority">
        {PRIORITIES.map((priority) => (
          <Form.Dropdown.Item
            key={priority}
            value={priority}
            title={priority[0].toUpperCase() + priority.slice(1)}
            icon={priorityIcon(priority)}
          />
        ))}
      </Form.Dropdown>

      <Form.DatePicker {...itemProps.dueDate} title="Due Date" type={Form.DatePicker.Type.Date} />

      <Form.Dropdown {...itemProps.assigneeId} title="Assignee">
        <Form.Dropdown.Item value="" title="Nobody" icon={Icon.MinusCircle} />
        {members.map((member) => (
          <Form.Dropdown.Item
            key={member.id}
            value={member.id}
            title={member.name ?? member.email ?? member.id}
            icon={memberIcon(member)}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
