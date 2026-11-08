import { randomUUID } from "node:crypto";
import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import type { Folder } from "../models/folder";
import { useLauncherState } from "../hooks/useLauncherState";
import { createFolder, renameFolder } from "../utils/hierarchy";
import { perform } from "./feedback";

export function FolderForm({ parentId, folder }: { parentId: string | null; folder?: Folder }) {
  const { update } = useLauncherState();
  const { pop } = useNavigation();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function submit(values: { name: string }) {
    if (saving) return;
    if (!values.name.trim()) {
      setError("Enter a folder name.");
      return;
    }
    setSaving(true);
    const saved = await perform("Could Not Save Folder", () =>
      update((state) =>
        folder ? renameFolder(state, folder.id, values.name) : createFolder(state, randomUUID(), values.name, parentId),
      ),
    );
    setSaving(false);
    if (saved) pop();
  }

  return (
    <Form
      navigationTitle={folder ? "Rename Folder" : "Create Folder"}
      isLoading={saving}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={folder ? "Rename Folder" : "Create Folder"} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Development"
        defaultValue={folder?.name}
        error={error}
        onChange={() => setError(undefined)}
        autoFocus
      />
    </Form>
  );
}
