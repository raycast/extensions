import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

/** Picks a JSON export and hands its path to `onImport`, which returns how many items it added or updated. */
export function ImportForm(props: { title: string; description: string; onImport: (path: string) => Promise<string> }) {
  const { pop } = useNavigation();

  async function submit(values: { file: string[] }) {
    const path = values.file?.[0];
    if (!path) {
      await showToast({ style: Toast.Style.Failure, title: "Choose a file first" });
      return;
    }
    try {
      const message = await props.onImport(path);
      await showToast({ style: Toast.Style.Success, title: message });
      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't import" });
    }
  }

  return (
    <Form
      navigationTitle={props.title}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import" icon={Icon.Download} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text={props.description} />
      <Form.FilePicker id="file" title="Export File" allowMultipleSelection={false} canChooseDirectories={false} />
    </Form>
  );
}
