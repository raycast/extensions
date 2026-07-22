import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  popToRoot,
  showToast,
} from "@raycast/api";
import { useState } from "react";
import { importGifFiles } from "./importer";
import { addLocalFolders, addLocalGifs } from "./storage";

export default function ImportGifs({
  onImported,
}: {
  onImported?: () => void | Promise<void>;
} = {}) {
  const [loading, setLoading] = useState(false);

  async function submit(values: { files: string[]; folders: string[] }) {
    if (!values.files.length && !values.folders.length) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Choose GIF files or folders",
      });
      return;
    }
    setLoading(true);
    let rollback: (() => Promise<void>) | undefined;
    try {
      const imported = await importGifFiles(values.files);
      rollback = imported.rollback;
      await addLocalFolders(values.folders);
      await addLocalGifs(imported.items);
      rollback = undefined;
      const items = imported.items;
      const importedParts = [
        items.length
          ? `${items.length} GIF${items.length === 1 ? "" : "s"}`
          : "",
        values.folders.length
          ? `${values.folders.length} folder${values.folders.length === 1 ? "" : "s"}`
          : "",
      ].filter(Boolean);
      await showToast({
        style: Toast.Style.Success,
        title: `Imported ${importedParts.join(" and ")}`,
      });
      await onImported?.();
      await popToRoot();
    } catch (error) {
      await rollback?.();
      await showToast({
        style: Toast.Style.Failure,
        title: "Import failed",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Import GIFs"
            icon={Icon.Download}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="files"
        title="GIF Files"
        allowMultipleSelection
        canChooseDirectories={false}
        canChooseFiles
      />
      <Form.FilePicker
        id="folders"
        title="Linked GIF Folders"
        allowMultipleSelection
        canChooseDirectories
        canChooseFiles={false}
      />
      <Form.Description text="Files are copied into the extension library. They are optimized to your configured size when you copy them." />
      <Form.Description text="Linked folders are scanned recursively whenever the extension opens. New GIFs appear automatically and source files are never copied or deleted." />
    </Form>
  );
}
