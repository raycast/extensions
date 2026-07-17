import { Action, Icon, Form, ActionPanel, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClickUpClient } from "../../api/clickup";
import { Shortcuts } from "../../constants/shortcuts";
import { useTasksContext, TasksProvider } from "../../contexts/TasksContext";
import { ClickUpTask, ClickUpList } from "../../types/clickup";

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

export function NextStatus({ task }: Props) {
  const { revertTaskStatus, updateTaskStatus } = useTasksContext();
  const { data: listData } = useCachedPromise(
    async (listId: string) => {
      const client = getClickUpClient();
      return await client.getList(listId);
    },
    [task.list.id],
  );

  if (!listData) return null;

  const nextStatus = getNextStatusFromList(task.status.status, listData.statuses);
  if (!nextStatus) return null;

  const handleNextStatus = async () => {
    const originalStatus = task.status.status;
    updateTaskStatus(task.id, nextStatus);

    try {
      const client = getClickUpClient();
      await client.updateTask(task.id, { status: nextStatus });
      await showToast({
        message: `Changed to ${nextStatus}`,
        style: Toast.Style.Success,
        title: "Status Updated",
      });
    } catch (error) {
      revertTaskStatus(task.id, originalStatus);
      await showToast({
        message: error instanceof Error ? error.message : String(error),
        style: Toast.Style.Failure,
        title: "Failed to Update Status",
      });
    }
  };

  return (
    <Action icon={Icon.ArrowRight} onAction={handleNextStatus} shortcut={Shortcuts.NextStatus} title="Next Status" />
  );
}

interface ChangeStatusFormProps {
  task: ClickUpTask;
}

function ChangeStatusForm({ task }: ChangeStatusFormProps) {
  const { revertTaskStatus, updateTaskStatus } = useTasksContext();
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

  const handleSubmit = async (values: { status: string }) => {
    const newStatus = values.status;
    const originalStatus = task.status.status;

    if (newStatus === originalStatus) {
      pop();
      return;
    }

    updateTaskStatus(task.id, newStatus);

    try {
      const client = getClickUpClient();
      await client.updateTask(task.id, { status: newStatus });
      pop();
      await showToast({
        message: `Changed to ${newStatus}`,
        style: Toast.Style.Success,
        title: "Status Updated",
      });
    } catch (error) {
      revertTaskStatus(task.id, originalStatus);
      await showToast({
        message: error instanceof Error ? error.message : String(error),
        style: Toast.Style.Failure,
        title: "Failed to Update Status",
      });
    }
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
  const { tasks } = useTasksContext();
  return (
    <Action.Push
      icon={Icon.Pencil}
      shortcut={Shortcuts.ChangeStatus}
      target={
        <TasksProvider tasks={tasks}>
          <ChangeStatusForm task={task} />
        </TasksProvider>
      }
      title="Change Status"
    />
  );
}
