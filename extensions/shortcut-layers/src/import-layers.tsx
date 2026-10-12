import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { existsSync, lstatSync, readFileSync } from "fs";
import { useState } from "react";
import { loadLayers, saveLayers } from "./data";
import { mergeLayers, parseLayersJson } from "./transfer";

export default function Command() {
  return <ImportLayersForm />;
}

interface ImportValues {
  paste: string;
  files: string[];
}

export function ImportLayersForm() {
  const [importing, setImporting] = useState(false);
  const { pop } = useNavigation();
  const { handleSubmit } = useForm<ImportValues>({
    async onSubmit(values) {
      setImporting(true);
      try {
        let text = values.paste?.trim() ?? "";
        const file = values.files?.[0];
        if (!text) {
          if (!file || !existsSync(file) || !lstatSync(file).isFile()) {
            throw new Error("Pick a valid file or paste JSON text");
          }
          text = readFileSync(file, "utf8");
        }

        const incoming = parseLayersJson(text);
        const existing = await loadLayers();
        const { layers, added, updated, addedEntries, skippedEntries } = mergeLayers(existing, incoming);
        await saveLayers(layers);
        pop();
        showToast({
          style: Toast.Style.Success,
          title: `Imported: ${added} new layer${added === 1 ? "" : "s"}, ${updated} merged`,
          message: `${addedEntries} action${addedEntries === 1 ? "" : "s"} added, ${skippedEntries} skipped`,
        });
      } catch (error) {
        showToast({ style: Toast.Style.Failure, title: "Import failed", message: (error as Error).message });
      } finally {
        setImporting(false);
      }
    },
  });

  return (
    <Form
      isLoading={importing}
      navigationTitle="Import Layers"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import & Merge" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="paste"
        title="Paste JSON"
        placeholder='[{"name":"Apps","entries":[{"key":"g","title":"Ghostty","kind":"app","value":"/Applications/Ghostty.app"}]}]'
      />
      <Form.FilePicker
        id="files"
        title="…or pick a .json file"
        allowMultipleSelection={false}
        canChooseDirectories={false}
      />
    </Form>
  );
}
