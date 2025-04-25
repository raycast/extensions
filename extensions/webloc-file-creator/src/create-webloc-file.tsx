import { Form, ActionPanel, Action, showHUD, popToRoot } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import path from "path";

interface CommandArguments {
  URL?: string;
}

export default function Command(props: { arguments: CommandArguments }) {
  async function saveWebloc(values: { folder: string[]; filename: string }) {
    if (!values.folder || values.folder.length === 0) {
      await showHUD("❌ No folder selected.");
      return;
    }

    const fullPath = path.join(values.folder[0], `${values.filename}.webloc`);

    const script = `
      set savePath to "${fullPath}"
      set fileRef to open for access POSIX file savePath with write permission
      set eof of fileRef to 0
      write "{ URL = \\"${props.arguments.URL ?? "https://example.com/"}\\"; }" to fileRef
      close access fileRef
    `;

    try {
      await runAppleScript(script);
      await showHUD("✅ Webloc saved");
    } catch (err) {
      console.error(err);
      await showHUD("❌ Error saving webloc");
    }

    await popToRoot();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Webloc" onSubmit={saveWebloc} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folder"
        title="Save Folder"
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
      />
      <Form.TextField
        id="filename"
        title="Filename"
        placeholder="your-filename-here"
        defaultValue="your-filename-here"
      />
    </Form>
  );
}
