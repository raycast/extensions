import { Action, ActionPanel, Form, LocalStorage, showToast, Toast } from "@raycast/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Command(options: any) {
  const updateItem = async (values: { id: string; title: string }) => {
    await LocalStorage.setItem(values.id, values.title);
    await showToast(Toast.Style.Success, "Item updated");
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Item" onSubmit={updateItem} />
        </ActionPanel>
      }
    >
      <Form.TextField id="id" title="Key" defaultValue={options?.arguments?.id} placeholder="Enter short link Key" />
      <Form.TextField
        id="title"
        title="Value"
        defaultValue={options?.arguments?.title}
        placeholder="Enter short link Value"
      />
    </Form>
  );
}
