import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";

interface Props {
  onPick: (path: string) => void;
}

export default function FilePickerForm({ onPick }: Props) {
  const { pop } = useNavigation();

  function handleSubmit(values: { files: string[] }) {
    if (!values.files || values.files.length === 0) {
      showToast({ style: Toast.Style.Failure, title: "Nothing selected" });
      return;
    }
    values.files.forEach(onPick);
    pop();
  }

  return (
    <Form
      navigationTitle="Add Files & Folders"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="files"
        title="Files & Folders"
        allowMultipleSelection
        canChooseDirectories
        canChooseFiles
        info="These open with `open <path>` when the ritual is activated."
      />
    </Form>
  );
}
