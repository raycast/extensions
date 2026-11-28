import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { updateProjectFileDate } from "../services/file-operations";
import { PremiereFile } from "../types";

interface EditDateFormProps {
  file: PremiereFile;
  onUpdated?: () => void;
}

export function EditDateForm({ file, onUpdated }: EditDateFormProps) {
  const { pop } = useNavigation();
  const [date, setDate] = useState<Date | null>(file.lastModifiedDate);

  const handleSubmit = async () => {
    if (!date || isNaN(date.getTime())) {
      await showFailureToast("Please select a valid date.", {
        title: "Invalid date selected",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating timestamp...",
    });

    try {
      await updateProjectFileDate(file.path, date);
      toast.style = Toast.Style.Success;
      toast.title = "Project timestamp updated";
      if (onUpdated) {
        onUpdated();
      }
      pop();
    } catch (err: unknown) {
      await showFailureToast(err, { title: "Failed to update project timestamp" });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Timestamp" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Project File"
        text={`${file.name} (Modified: ${file.lastModifiedDate.toLocaleString()})`}
      />
      <Form.DatePicker id="date" title="Target Date" value={date} onChange={setDate} />
      <Form.Description text="Updates the filesystem modification time (and creation date where supported)." />
    </Form>
  );
}
