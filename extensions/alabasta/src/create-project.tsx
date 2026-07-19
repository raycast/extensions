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
  people: Array<{ id: string; name: string }>;
};

export default function CreateProject() {
  const { data, isLoading } = useCachedPromise(async () => {
    const id = await workspaceId();
    return { id, context: await api<Context>("context", { workspaceId: id }) };
  });
  async function submit(values: Record<string, string | Date | null>) {
    if (!data) return;
    await api("projects/create", {
      workspaceId: data.id,
      productId: values.productId || undefined,
      title: values.title,
      description: values.description || undefined,
      status: values.status,
      priority: values.priority,
      leadId: values.leadId || undefined,
      startDate:
        values.startDate instanceof Date
          ? values.startDate.getTime()
          : undefined,
      endDate:
        values.endDate instanceof Date ? values.endDate.getTime() : undefined,
    });
    await showToast({ style: Toast.Style.Success, title: "Project created" });
    await popToRoot();
  }
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Project" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" autoFocus />
      <Form.TextArea id="description" title="Description" />
      <Form.Dropdown id="productId" title="Product" defaultValue="">
        <Form.Dropdown.Item value="" title="Workspace project" />
        {data?.context.products.map((item) => (
          <Form.Dropdown.Item key={item.id} value={item.id} title={item.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="status" title="Status" defaultValue="planned">
        <Form.Dropdown.Item value="planned" title="Planned" />
        <Form.Dropdown.Item value="active" title="Active" />
        <Form.Dropdown.Item value="paused" title="Paused" />
        <Form.Dropdown.Item value="completed" title="Completed" />
      </Form.Dropdown>
      <Form.Dropdown id="priority" title="Priority" defaultValue="no_priority">
        <Form.Dropdown.Item value="no_priority" title="No priority" />
        <Form.Dropdown.Item value="urgent" title="Urgent" />
        <Form.Dropdown.Item value="high" title="High" />
        <Form.Dropdown.Item value="medium" title="Medium" />
        <Form.Dropdown.Item value="low" title="Low" />
      </Form.Dropdown>
      <Form.Dropdown id="leadId" title="Lead" defaultValue="">
        <Form.Dropdown.Item value="" title="No lead" />
        {data?.context.people.map((item) => (
          <Form.Dropdown.Item key={item.id} value={item.id} title={item.name} />
        ))}
      </Form.Dropdown>
      <Form.DatePicker
        id="startDate"
        title="Start date"
        type={Form.DatePicker.Type.Date}
      />
      <Form.DatePicker
        id="endDate"
        title="Target date"
        type={Form.DatePicker.Type.Date}
      />
    </Form>
  );
}
