import {
  Action,
  ActionPanel,
  Form,
  Toast,
  popToRoot,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { api, workspaceId } from "./api";

type Context = {
  products: Array<{ id: string; name: string }>;
  statuses: Array<{ key: string; label: string }>;
  people: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; title: string }>;
  labels: Array<{ id: string; name: string }>;
};

export default function CreateTask() {
  const { data, isLoading } = useCachedPromise(async () => {
    const id = await workspaceId();
    return { id, context: await api<Context>("context", { workspaceId: id }) };
  });

  async function submit(
    values: Record<string, string | string[] | Date | null>,
  ) {
    if (!data) return;
    const result = await api<{ identifier: string }>("tasks/create", {
      workspaceId: data.id,
      productId: values.productId,
      title: values.title,
      description: values.description || undefined,
      status: values.status,
      priority: values.priority,
      assigneeId: values.assigneeId || undefined,
      projectId: values.projectId || undefined,
      labelIds: values.labelIds ?? [],
      dueDate:
        values.dueDate instanceof Date ? values.dueDate.getTime() : undefined,
    });
    await showToast({
      style: Toast.Style.Success,
      title: `Created ${result.identifier}`,
    });
    await popToRoot();
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" autoFocus />
      <Form.TextArea id="description" title="Description" />
      <Form.Dropdown id="productId" title="Product">
        {data?.context.products.map((item) => (
          <Form.Dropdown.Item key={item.id} value={item.id} title={item.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="status" title="Status" defaultValue="todo">
        {data?.context.statuses.map((item) => (
          <Form.Dropdown.Item
            key={item.key}
            value={item.key}
            title={item.label}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="priority" title="Priority" defaultValue="no_priority">
        <Form.Dropdown.Item value="no_priority" title="No priority" />
        <Form.Dropdown.Item value="urgent" title="Urgent" />
        <Form.Dropdown.Item value="high" title="High" />
        <Form.Dropdown.Item value="medium" title="Medium" />
        <Form.Dropdown.Item value="low" title="Low" />
      </Form.Dropdown>
      <Form.Dropdown id="assigneeId" title="Assignee" defaultValue="">
        <Form.Dropdown.Item value="" title="Unassigned" />
        {data?.context.people.map((item) => (
          <Form.Dropdown.Item key={item.id} value={item.id} title={item.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="projectId" title="Project" defaultValue="">
        <Form.Dropdown.Item value="" title="No project" />
        {data?.context.projects.map((item) => (
          <Form.Dropdown.Item
            key={item.id}
            value={item.id}
            title={item.title}
          />
        ))}
      </Form.Dropdown>
      <Form.TagPicker id="labelIds" title="Labels">
        {data?.context.labels.map((item) => (
          <Form.TagPicker.Item
            key={item.id}
            value={item.id}
            title={item.name}
          />
        ))}
      </Form.TagPicker>
      <Form.DatePicker
        id="dueDate"
        title="Due date"
        type={Form.DatePicker.Type.Date}
      />
    </Form>
  );
}
