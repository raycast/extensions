import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { addFolder } from "./api";

export default function Command() {
  return <AddFolderForm />;
}

export function AddFolderForm({ onAdded }: { onAdded?: () => void }) {
  const { pop } = useNavigation();
  const [busy, setBusy] = useState(false);

  return (
    <Form
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Folders"
            onSubmit={async (values: { folders?: string[] }) => {
              const folders = values.folders ?? [];
              if (folders.length === 0) {
                await showToast({ style: Toast.Style.Failure, title: "Choose at least one folder" });
                return;
              }
              setBusy(true);
              const errors: string[] = [];
              for (const folder of folders) {
                try {
                  await addFolder(folder);
                } catch (error) {
                  errors.push(error instanceof Error ? error.message : String(error));
                }
              }
              setBusy(false);
              if (errors.length > 0) {
                await showToast({ style: Toast.Style.Failure, title: "Could not add every folder", message: errors.join("\n") });
                return;
              }
              await showToast({ style: Toast.Style.Success, title: folders.length === 1 ? "Folder added" : "Folders added" });
              onAdded?.();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Index" text="Choose one or more directories. Nested folders that are already covered are rejected." />
      <Form.FilePicker id="folders" title="Folders" allowMultipleSelection canChooseDirectories canChooseFiles={false} />
    </Form>
  );
}
