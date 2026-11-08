import { randomUUID } from "node:crypto";
import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useForm } from "@raycast/utils";
import type { Folder } from "../models/folder";
import { useLauncherState } from "../hooks/useLauncherState";
import { createFolder, renameFolder } from "../utils/hierarchy";
import { perform } from "./feedback";

export function FolderForm({ parentId, folder }: { parentId: string | null; folder?: Folder }) {
  const { update } = useLauncherState();
  const { pop } = useNavigation();
  const [saving, setSaving] = useState(false);

  async function submit(values: { name: string }) {
    if (saving) return;
    setSaving(true);
    const saved = await perform("Could Not Save Folder", () =>
      update((state) =>
        folder ? renameFolder(state, folder.id, values.name) : createFolder(state, randomUUID(), values.name, parentId),
      ),
    );
    setSaving(false);
    if (saved) pop();
  }

  const { handleSubmit, itemProps } = useForm<{ name: string }>({
    initialValues: { name: folder?.name ?? "" },
    validation: { name: (value) => (value?.trim() ? undefined : "Enter a folder name.") },
    onSubmit: submit,
  });

  return (
    <Form
      navigationTitle={folder ? "Rename Folder" : "Create Folder"}
      isLoading={saving}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={folder ? "Rename Folder" : "Create Folder"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Development" {...itemProps.name} autoFocus />
    </Form>
  );
}
