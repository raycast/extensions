import { Action, ActionPanel, Clipboard, Form, Icon, Toast, popToRoot, showToast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import fs from "fs";
import os from "os";
import path from "path";
import { useState } from "react";
import { CSV_PATH, loadEntries } from "./lib/storage";

/** `name.csv`, `name-2.csv`, … so an export never overwrites an earlier backup. */
function availablePath(target: string): string {
  const { dir, name, ext } = path.parse(target);
  let candidate = target;
  for (let counter = 2; fs.existsSync(candidate); counter++) {
    candidate = path.join(dir, `${name}-${counter}${ext}`);
  }
  return candidate;
}

export default function Command() {
  const defaultFolder = path.join(os.homedir(), "Downloads");
  const fileName = `qr-codes-${new Date().toISOString().slice(0, 10)}.csv`;
  // Also creates the file on a first run, so the export is never missing.
  const { data: entries = [], isLoading } = useCachedPromise(loadEntries, [], { initialData: [] });
  const [error, setError] = useState<string | undefined>();

  async function submit(values: { folder: string[] }) {
    const folder = values.folder?.[0];
    if (!folder) {
      setError("Choose a destination folder");
      return;
    }
    if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
      setError("That folder does not exist");
      return;
    }
    try {
      const target = availablePath(path.join(folder, fileName));
      fs.copyFileSync(CSV_PATH, target);
      await Clipboard.copy(target);
      await showToast({
        style: Toast.Style.Success,
        title: `Exported ${entries.length} ${entries.length === 1 ? "entry" : "entries"}`,
        message: target,
      });
      await popToRoot();
    } catch (error) {
      await showFailureToast(error, { title: "Could not export the data" });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Export Data"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Export" icon={Icon.Download} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folder"
        title="Destination Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        defaultValue={[defaultFolder]}
        error={error}
        onChange={() => setError(undefined)}
      />
      <Form.Description
        title="File"
        text={`${fileName} — a copy of all ${entries.length} ${entries.length === 1 ? "entry" : "entries"}. The path is copied to the clipboard after exporting.`}
      />
    </Form>
  );
}
