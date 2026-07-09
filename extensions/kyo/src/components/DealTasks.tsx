import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { DealTasks } from "../api/resources";
import { PRIORITY_LABELS } from "../api/types";
import {
  formatDate,
  priorityColor,
  priorityLabel,
  showKyoError,
  taskStatusIcon,
  toDateOnly,
} from "../lib/helpers";

/** Task list attached to a specific deal (deal_tasks resource). */
export function DealTasksList({
  dealId,
  title,
}: {
  dealId: string;
  title: string;
}) {
  const { data, isLoading, revalidate } = useCachedPromise(
    (id: string) => DealTasks.list({ deal_id: id }),
    [dealId],
    { initialData: [] },
  );

  async function toggle(taskId: string, completed: boolean) {
    try {
      await DealTasks.update(taskId, { completed: !completed });
      await showToast({
        style: Toast.Style.Success,
        title: !completed ? "Task completed" : "Task reopened",
      });
      revalidate();
    } catch (error) {
      await showKyoError(error, "Failed to update task");
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle={`Tasks · ${title}`}>
      <List.EmptyView
        title="No tasks on this deal"
        icon={Icon.CheckCircle}
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Task"
              icon={Icon.Plus}
              target={
                <CreateDealTaskForm dealId={dealId} onCreated={revalidate} />
              }
            />
          </ActionPanel>
        }
      />
      {data.map((task) => (
        <List.Item
          key={task.id}
          icon={taskStatusIcon(task.completed)}
          title={task.name}
          accessories={[
            task.is_private
              ? { icon: { source: Icon.Lock, tintColor: Color.SecondaryText } }
              : {},
            task.priority
              ? {
                  tag: {
                    value: priorityLabel(task.priority),
                    color: priorityColor(task.priority),
                  },
                }
              : {},
            task.due_date ? { text: formatDate(task.due_date) } : {},
          ]}
          actions={
            <ActionPanel>
              <Action
                title={task.completed ? "Reopen Task" : "Complete Task"}
                icon={task.completed ? Icon.Circle : Icon.CheckCircle}
                onAction={() => toggle(task.id, task.completed ?? false)}
              />
              <Action.Push
                title="Create Task"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                target={
                  <CreateDealTaskForm dealId={dealId} onCreated={revalidate} />
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export function CreateDealTaskForm({
  dealId,
  onCreated,
}: {
  dealId: string;
  onCreated?: () => void;
}) {
  const { pop } = useNavigation();

  async function submit(values: {
    name: string;
    due_date: Date | null;
    priority: string;
    description: string;
    is_private: boolean;
  }) {
    if (!values.name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return;
    }
    try {
      await DealTasks.create({
        deal_id: dealId,
        name: values.name.trim(),
        due_date: toDateOnly(values.due_date) ?? undefined,
        priority: values.priority ? Number(values.priority) : undefined,
        description: values.description || undefined,
        is_private: values.is_private || undefined,
      });
      await showToast({ style: Toast.Style.Success, title: "Task created" });
      onCreated?.();
      pop();
    } catch (error) {
      await showKyoError(error, "Failed to create task");
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Task"
            icon={Icon.Plus}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Follow up with the client"
        autoFocus
      />
      <Form.DatePicker
        id="due_date"
        title="Due Date"
        type={Form.DatePicker.Type.Date}
      />
      <Form.Dropdown id="priority" title="Priority" defaultValue="0">
        {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
          <Form.Dropdown.Item key={value} value={value} title={label} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Details…"
      />
      <Form.Checkbox id="is_private" label="Private task" />
    </Form>
  );
}
