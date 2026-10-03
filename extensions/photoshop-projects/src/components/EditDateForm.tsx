import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { PhotoshopFile } from "../types";
import { updateFileDate } from "../utils/fileAttributes";
import { formatRelativeDate } from "../utils/format";

interface EditDateFormProps {
  file: PhotoshopFile;
  onUpdated?: () => void;
}

export function EditDateForm({ file, onUpdated }: EditDateFormProps) {
  const { pop } = useNavigation();
  const [targetDate, setTargetDate] = useState<Date | null>(
    file.lastModifiedDate ? new Date(file.lastModifiedDate) : new Date(),
  );
  const [updateCreationDate, setUpdateCreationDate] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!targetDate || isNaN(targetDate.getTime())) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please select a valid date and time",
      });
      return;
    }

    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating file date attributes...",
    });

    try {
      await updateFileDate(file.path, targetDate, updateCreationDate);
      toast.style = Toast.Style.Success;
      toast.title = "Document date updated";
      toast.message = `${file.name} is now dated ${formatRelativeDate(targetDate)}`;
      if (onUpdated) onUpdated();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update date";
      toast.message = String(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyOffsetDays = (days: number) => {
    const base = new Date();
    base.setDate(base.getDate() + days);
    setTargetDate(base);
  };

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Apply Date Changes" onSubmit={handleSubmit} />
          <ActionPanel.Section title="Quick Presets">
            <Action title="Set to Right Now" onAction={() => setTargetDate(new Date())} />
            <Action title="Backdate 1 Day (-1D)" onAction={() => applyOffsetDays(-1)} />
            <Action title="Backdate 1 Week (-7D)" onAction={() => applyOffsetDays(-7)} />
            <Action title="Backdate 1 Month (-30D)" onAction={() => applyOffsetDays(-30)} />
            <Action title="Backdate 1 Year (-365D)" onAction={() => applyOffsetDays(-365)} />
            <Action title="Frontdate 1 Day (+1D)" onAction={() => applyOffsetDays(1)} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description title="Document" text={`${file.name} (${file.directoryName})`} />
      <Form.DatePicker
        id="targetDate"
        title="Modification Date"
        value={targetDate}
        onChange={setTargetDate}
        type={Form.DatePicker.Type.DateTime}
      />
      <Form.Checkbox
        id="updateCreationDate"
        label="Also backdate/frontdate macOS creation date"
        value={updateCreationDate}
        onChange={setUpdateCreationDate}
      />
    </Form>
  );
}
