import {
  Action,
  ActionPanel,
  Form,
  Toast,
  showToast,
  popToRoot,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { api, workspaceId } from "./api";
type Context = { products: Array<{ id: string; name: string }> };
export default function CreateDocument() {
  const { data } = useCachedPromise(async () => {
    const id = await workspaceId();
    return { id, context: await api<Context>("context", { workspaceId: id }) };
  });
  async function submit(values: Record<string, string>) {
    await api("documents/create", {
      workspaceId: data!.id,
      productId: values.productId || undefined,
      title: values.title,
      content: values.content,
      docType: values.docType || undefined,
      status: values.status,
    });
    await showToast({ style: Toast.Style.Success, title: "Document created" });
    await popToRoot();
  }
  return (
    <Form
      isLoading={!data}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Document" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" autoFocus />
      <Form.TextArea id="content" title="Markdown" />
      <Form.Dropdown id="productId" title="Scope">
        <Form.Dropdown.Item value="" title="Workspace" />
        {data?.context.products.map((item) => (
          <Form.Dropdown.Item key={item.id} value={item.id} title={item.name} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="docType"
        title="Document type"
        placeholder="e.g. prd"
      />
      <Form.Dropdown id="status" title="Status" defaultValue="draft">
        <Form.Dropdown.Item value="draft" title="Draft" />
        <Form.Dropdown.Item value="active" title="Active" />
        <Form.Dropdown.Item value="review" title="Review" />
      </Form.Dropdown>
    </Form>
  );
}
