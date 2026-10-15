import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";

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
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't import",
        message: error instanceof Error ? error.message : String(error),
      });
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
