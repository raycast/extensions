import { ActionPanel, closeMainWindow, Form, Icon, showToast, SubmitFormAction, ToastStyle } from "@raycast/api";
import open from "open";

interface FormValues {
  title: string;
  text: string;
  tags: string;
  openNote: string;
  timestamp: boolean;
  pin: boolean;
}

function CreateNoteAction() {
  async function handleSubmit(values: FormValues) {
    if (!values.text) {
      showToast(ToastStyle.Failure, "Please enter text");
      return;
    }
    open(
      `bear://x-callback-url/create?title=${encodeURIComponent(values.title)}&tags=${encodeURIComponent(
        values.tags
      )}&open_note=${values.openNote !== "no" ? "yes" : "no"}&new_window=${
        values.openNote === "new" ? "yes" : "no"
      }&show_window=${values.openNote !== "no" ? "yes" : "no"}&edit=${
        values.openNote === "no" ? "no" : "yes"
      }&timestamp=${values.timestamp ? "yes" : "no"}&text=${encodeURIComponent(values.text)}`,
      { background: values.openNote === "no" ? true : false }
    );
    await closeMainWindow();
  }
  return <SubmitFormAction icon={Icon.Document} title="Create Note" onSubmit={handleSubmit} />;
}

export default function NewNote() {
  return (
    <Form
      navigationTitle={"Create Note"}
      actions={
        <ActionPanel>
          <CreateNoteAction />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Note Title ..." />
      <Form.TextArea id="text" title="Text" placeholder="Text to add to note ..." />
      <Form.TextField id="tags" title="Tags" placeholder="comma,separated,tags" />
      <Form.Separator />
      <Form.Dropdown id="openNote" title="Open Note">
        <Form.Dropdown.Item value="no" title="Don't Open Note" />
        <Form.Dropdown.Item value="main" title="In Main Window" />
        <Form.Dropdown.Item value="new" title="In New Window" />
      </Form.Dropdown>
      <Form.Checkbox id="timestamp" label="Prepend time and date" />
      <Form.Checkbox id="pin" label="Pin note in notes list" />
    </Form>
  );
}
