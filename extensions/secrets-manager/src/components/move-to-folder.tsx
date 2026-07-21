import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { getStore } from "../lib/context";
import { splitFolder } from "../lib/parse";
import type { Secret } from "../lib/types";

export function MoveToFolder({ secret, onMoved }: { secret: Secret; onMoved?: () => void }) {
  const { pop } = useNavigation();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(values: { folder: string }) {
    setLoading(true);
    try {
      await getStore().move(secret.id, splitFolder(values.folder));
      await showToast({ style: Toast.Style.Success, title: "Moved secret" });
      onMoved?.();
      pop();
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to move", message: String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      isLoading={loading}
      navigationTitle={`Move "${secret.name}"`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Move" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="folder"
        title="Folder"
        defaultValue={secret.folder.join("/")}
        placeholder="work/dev (empty = root)"
      />
    </Form>
  );
}
