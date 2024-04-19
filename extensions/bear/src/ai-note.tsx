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
  AI,
} from "@raycast/api";
import open from "open";
import { showFailureToast } from "@raycast/utils";

interface FormValues {
  text: string;
  tags: string;
  openNote: string;
  timestamp: boolean;
  pin: boolean;
}

async function getAiText(text: string) {
  try {
    const aiText = await AI.ask(
      `
    Write a note based on this text: ${text}

    Follow these instructions:
    - Response must be in Markdown format
  `,
      { model: "openai-gpt-4-turbo" }
    );

    return aiText;
  } catch (error) {
    showFailureToast(error, { title: "Could not create a new note." });
  }
}

function CreateNoteAction() {
  async function handleSubmit(values: FormValues) {
    if (!values.text) {
      showToast(Toast.Style.Failure, "Please enter text");
      return;
    }

    await closeMainWindow();
    await showToast({ style: Toast.Style.Animated, title: "Creating a note" });

    const aiText = await getAiText(values.text);

    if (!aiText) {
      return;
    }

    open(
      `bear://x-callback-url/create?tags=${encodeURIComponent(values.tags)}&open_note=${
        values.openNote !== "no" ? "yes" : "no"
      }&new_window=${values.openNote === "new" ? "yes" : "no"}&show_window=${
        values.openNote !== "no" ? "yes" : "no"
      }&edit=${values.openNote === "no" ? "no" : "yes"}&timestamp=${
        values.timestamp ? "yes" : "no"
      }&text=${encodeURIComponent(aiText)}`,
      { background: values.openNote === "no" ? true : false }
    );
    await popToRoot({ clearSearchBar: true });
  }
  return <Action.SubmitForm icon={Icon.Document} title="Create Note" onSubmit={handleSubmit} />;
}

export default function NewAiNote() {
  const { newNoteOpenMode, prependTimeAndDate, pinNote } = getPreferenceValues();
  return (
    <Form
      navigationTitle={"Create Note"}
      actions={
        <ActionPanel>
          <CreateNoteAction />
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" title="Ai Text Instructions" placeholder="Ai generated text to add to note ..." />
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
