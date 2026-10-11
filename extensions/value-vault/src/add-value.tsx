import { showToast, Toast } from "@raycast/api";
import { v4 as uuidv4 } from "uuid";
import { saveEntry } from "./storage";
import { ValueEntry } from "./types";
import ValueForm from "./value-form";

interface Props {
  onSave?: () => void;
}

export default function AddValueForm({ onSave }: Props) {
  return (
    <ValueForm
      initialValues={{ label: "", value: "", type: "string" }}
      navigationTitle="Add Value"
      submitTitle="Save Value"
      onSubmit={async (data) => {
        const now = Date.now();
        const entry: ValueEntry = {
          id: uuidv4(),
          ...data,
          createdAt: now,
          updatedAt: now,
        };
        await saveEntry(entry);
        await showToast({ style: Toast.Style.Success, title: "Value saved" });
      }}
      onSuccess={onSave}
    />
  );
}
