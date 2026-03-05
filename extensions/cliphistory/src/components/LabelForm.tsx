import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { ClipboardEntry } from "../interfaces/clipboardEntry.interface";
import { useState } from "react";
import { getHistoryFromStorage, updateStorageHistory } from "../utils/storage";

export function LabelForm({
  entry,
  onSave,
}: {
  entry: ClipboardEntry;
  onSave: React.Dispatch<React.SetStateAction<ClipboardEntry[]>>;
}) {
  const { pop } = useNavigation();
  const [label, setLabel] = useState(entry.label ?? "");

  async function save() {
    const history = await getHistoryFromStorage();
    const updated = history.map((item) => (item.id === entry.id ? { ...item, label } : item));
    await updateStorageHistory(updated, onSave);
    await showToast({ style: Toast.Style.Success, title: "Label Saved" });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Save Label" onAction={save} />
        </ActionPanel>
      }
    >
      <Form.TextField id="label" title="Label" value={label} onChange={setLabel} />
    </Form>
  );
}
