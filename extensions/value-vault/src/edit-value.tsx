import { showToast, Toast } from "@raycast/api";
import { updateEntry } from "./storage";
import { ValueEntry } from "./types";
import ValueForm from "./value-form";

interface Props {
  entry: ValueEntry;
  onUpdate?: () => void;
}

export default function EditValueForm({ entry, onUpdate }: Props) {
  return (
    <ValueForm
      initialValues={{
        label: entry.label,
        value: entry.value,
        type: entry.type,
      }}
      navigationTitle="Edit Value"
      submitTitle="Save Changes"
      onSubmit={async (data) => {
        const updated: ValueEntry = {
          ...entry,
          ...data,
          updatedAt: Date.now(),
        };
        await updateEntry(updated);
        await showToast({ style: Toast.Style.Success, title: "Value updated" });
      }}
      onSuccess={onUpdate}
    />
  );
}
