import { Form, FormValue, ActionPanel, SubmitFormAction, showToast, ToastStyle } from "@raycast/api";

export default function Command() {
  function handleSubmit(values: Record<string, FormValue>) {
    console.log(values);
    showToast(ToastStyle.Success, "Submitted form", "See logs for submitted values");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="URL" placeholder="Enter URL" />
      <Form.TextField id="title" title="Title" placeholder="Enter title" />
      <Form.TextArea id="description" title="Description" placeholder="Enter description" />
      <Form.Separator />
      <Form.TagPicker id="tags" title="Tags">
        <Form.TagPickerItem value="tag" title="Tag" />
      </Form.TagPicker>
      <Form.Checkbox id="private" title="" label="Private" storeValue />
      <Form.Checkbox id="readLater" title="" label="Read Later" storeValue />
    </Form>
  );
}
