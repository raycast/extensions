import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { getClickUpClient } from "../../api/clickup";
import { Shortcuts } from "../../constants/shortcuts";
import { TasksProvider, useTasksContext } from "../../contexts/TasksContext";
import type { ClickUpList, ClickUpTask } from "../../types/clickup";

interface Props {
  task: ClickUpTask;
}

function getNextStatusFromList(currentStatus: string, statuses: ClickUpList["statuses"]): string | undefined {
  if (!statuses || statuses.length === 0) return undefined;
  const sortedStatuses = [...statuses].sort((a, b) => (a.orderindex ?? 0) - (b.orderindex ?? 0));
  const currentIndex = sortedStatuses.findIndex((s) => s.status === currentStatus);
  if (currentIndex === -1 || currentIndex === sortedStatuses.length - 1) return undefined;
  return sortedStatuses[currentIndex + 1].status;
}

export function NextStatus({ task: initialTask }: Props) {
  const { tasks, updateTaskStatus } = useTasksContext();
  const task = tasks.find((t) => t.id === initialTask.id) ?? initialTask;
  const { data: listData, isLoading } = useCachedPromise(
    async (listId: string) => {
      const client = getClickUpClient();
      return await client.getList(listId);
    },
    [task.list.id],
  );

  if (isLoading || !listData) return null;

  const nextStatus = getNextStatusFromList(task.status.status, listData.statuses);
  if (!nextStatus) return null;

  const handleNextStatus = () => {
    updateTaskStatus(task.id, nextStatus);
  };

  return (
    <Action icon={Icon.ArrowRight} onAction={handleNextStatus} shortcut={Shortcuts.NextStatus} title="Next Status" />
  );
}

interface ChangeStatusFormProps {
  task: ClickUpTask;
}

function ChangeStatusForm({ task: initialTask }: ChangeStatusFormProps) {
  const { tasks, updateTaskStatus } = useTasksContext();
  const task = tasks.find((t) => t.id === initialTask.id) ?? initialTask;
  const { pop } = useNavigation();
  const { data: listData, isLoading } = useCachedPromise(
    async (listId: string) => {
      const client = getClickUpClient();
      return await client.getList(listId);
    },
    [task.list.id],
  );

  const statuses = listData?.statuses || [];
  const sortedStatuses = [...statuses].sort((a, b) => (a.orderindex ?? 0) - (b.orderindex ?? 0));

  const handleSubmit = (values: { status: string }) => {
    const newStatus = values.status;

    if (newStatus === task.status.status) {
      pop();
      return;
    }

    pop();
    updateTaskStatus(task.id, newStatus);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Change Status" />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.Dropdown defaultValue={task.status.status} id="status" title="Status">
        {sortedStatuses.map((status) => (
          <Form.Dropdown.Item key={status.status} title={status.status.toUpperCase()} value={status.status} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export function ChangeStatus({ task }: Props) {
  const { tasks, updateTaskStatus } = useTasksContext();
  return (
    <Action.Push
      icon={Icon.Pencil}
      shortcut={Shortcuts.ChangeStatus}
      target={
        <TasksProvider tasks={tasks} updateTaskStatus={updateTaskStatus}>
          <ChangeStatusForm task={task} />
        </TasksProvider>
      }
      title="Change Status"
    />
  );
}
