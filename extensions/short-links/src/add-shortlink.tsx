import { Action, ActionPanel, Form, LocalStorage, showToast, Toast } from "@raycast/api";

export default function Command() {
  const addItem = async (values: { id: string; title: string }) => {
    await LocalStorage.setItem(values.id, values.title);
    await showToast(Toast.Style.Success, "Item added");
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Item" onSubmit={addItem} />
        </ActionPanel>
      }
    >
      <Form.TextField id="id" title="Key" placeholder="Enter short link Key" />
      <Form.TextField id="title" title="Value" placeholder="Enter short link Value" />
    </Form>
  );
}
