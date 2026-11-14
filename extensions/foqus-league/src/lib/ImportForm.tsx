import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { readFile } from "node:fs/promises";
import { pluralize } from "./format.ts";
import { store } from "./runtime.ts";
import { parseImport } from "./transfer.ts";

export function ImportForm({ onDone }: { onDone: () => void }) {
  const { pop } = useNavigation();

  async function submit(values: { file: string[] }) {
    const file = values.file[0];
    if (!file) return;
    try {
      const sessions = parseImport(await readFile(file, "utf8"));
      if (!sessions.length) {
        await showToast({ style: Toast.Style.Failure, title: "No sessions in that file" });
        return;
      }
      const added = await store.add(sessions);
      const skipped = sessions.length - added;
      await showToast({
        style: Toast.Style.Success,
        title: `Imported ${pluralize(added, "session")}`,
        message: skipped ? `${skipped} skipped, already known` : undefined,
      });
      onDone();
      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Import" });
    }
  }

  return (
    <Form
      navigationTitle="Import Sessions"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Sessions" icon={Icon.Upload} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        title="File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        info="A Foqus export. Sessions already on record are skipped; nothing is deleted."
      />
    </Form>
  );
}
