import {
  ActionPanel,
  Action,
  closeMainWindow,
  Form,
  Icon,
  showToast,
  Toast,
  popToRoot,
  getPreferenceValues,
} from "@raycast/api";
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
      showToast(Toast.Style.Failure, "Please enter text");
      return;
    }
    open(
      `bear://x-callback-url/create?title=${values.title}&tags=${values.tags}&open_note=${
        values.openNote !== "no" ? "yes" : "no"
      }&new_window=${values.openNote === "new" ? "yes" : "no"}&show_window=${
        values.openNote !== "no" ? "yes" : "no"
      }&edit=${values.openNote === "no" ? "no" : "yes"}&timestamp=${values.timestamp ? "yes" : "no"}&text=${
        values.text
      }&pin=${values.pin ? "yes" : "no"}`,
      { background: values.openNote === "no" },
    );
    await closeMainWindow();
    await popToRoot({ clearSearchBar: true });
  }

  return <Action.SubmitForm icon={Icon.Document} title="Create Note" onSubmit={handleSubmit} />;
}

export default function NewNote() {
  const { newNoteOpenMode, prependTimeAndDate, pinNote } = getPreferenceValues<Preferences.NewNote>();
  return (
    <Form
      navigationTitle={"Create Note"}
      actions={
        <ActionPanel>
          <CreateNoteAction />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Note title" />
      <Form.TextArea id="text" title="Text" placeholder="Text to add to note" />
      <Form.TextField id="tags" title="Tags" placeholder="comma,separated,tags" />
      <Form.Separator />
      <Form.Dropdown id="openNote" title="Open Note" defaultValue={newNoteOpenMode}>
        <Form.Dropdown.Item value="no" title="Don't Open Note" />
        <Form.Dropdown.Item value="main" title="In Main Window" />
        <Form.Dropdown.Item value="new" title="In New Window" />
      </Form.Dropdown>
      <Form.Checkbox id="timestamp" label="Prepend time and date" defaultValue={prependTimeAndDate} />
      <Form.Checkbox id="pin" label="Pin note in notes list" defaultValue={pinNote} />
    </Form>
  );
}
