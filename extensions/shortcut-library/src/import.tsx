import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useState } from "react";
import { existsSync, lstatSync, readFileSync } from "fs";
import { parseJsonImport, saveShortcuts, mergeShortcuts, loadShortcuts } from "./data";

interface ImportValues {
  paste: string;
  files: string[];
}

export function ImportForm({ mutate }: { mutate: () => void }) {
  const [importing, setImporting] = useState(false);
  const { pop } = useNavigation();
  const { handleSubmit } = useForm<ImportValues>({
    onSubmit(values) {
      setImporting(true);
      runImport(values, mutate, () => setImporting(false), pop);
    },
  });

  return (
    <Form
      isLoading={importing}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import & Merge" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      navigationTitle="Import Shortcuts"
    >
      <Form.TextArea id="paste" title="Paste JSON" placeholder='[{"title":"...","keys":"..."}]' />
      <Form.FilePicker id="files" title="...or pick a .json file" allowMultipleSelection={false} />
    </Form>
  );
}

async function runImport(values: ImportValues, mutate: () => void, done: () => void, pop: () => void) {
  let text = values.paste?.trim() ?? "";
  const file = values.files?.[0];

  try {
    if (!text) {
      if (!file || !existsSync(file) || !lstatSync(file).isFile()) {
        throw new Error("Pick a valid file or paste JSON text");
      }
      text = readFileSync(file, "utf8");
    }

    const parsed = parseJsonImport(text);
    const existing = await loadShortcuts();
    const { added, skipped } = mergeShortcuts(existing, parsed);
    await saveShortcuts([...existing, ...added]);
    mutate();
    pop();
    const dupNote = skipped > 0 ? ` (skipped ${skipped} duplicate${skipped === 1 ? "" : "s"})` : "";
    showToast({ style: Toast.Style.Success, title: `Imported ${added.length} shortcuts${dupNote}` });
  } catch (e) {
    showToast({ style: Toast.Style.Failure, title: "Import failed", message: (e as Error).message });
  } finally {
    done();
  }
}
