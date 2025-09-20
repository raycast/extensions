import React from "react";
import { Form, ActionPanel, Action, useNavigation, showToast, Toast } from "@raycast/api";
import { updateItem } from "../storage";
import { Item, FormValues, EnhancedItem } from "../types";

export const EditTimerForm: React.FC<{ item: Item; onEdit: () => Promise<EnhancedItem[]> }> = ({ item, onEdit }) => {
  const { pop } = useNavigation();

  const handleSubmit = async (values: FormValues) => {
    try {
      const updatedItem: Item = {
        ...item,
        start: values.startTime || item.start,
        end: values.endTime || item.end,
        notes: values.notes,
      };

      await updateItem(item.id!, updatedItem);
      const updatedItems = await onEdit();
      await showToast({ title: "Timer updated", style: Toast.Style.Success });

      // Only navigate back after ensuring we have the updated data
      if (updatedItems) {
        pop();
      }
      return true;
    } catch (error) {
      await showToast({
        title: "Failed to update timer",
        message: error instanceof Error ? error.message : "Unknown error",
        style: Toast.Style.Failure,
      });
      return false;
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Timer" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.DatePicker id="startTime" title="Start Time" defaultValue={new Date(item.start)} />

      <Form.DatePicker id="endTime" title="End Time" defaultValue={item.end ? new Date(item.end) : undefined} />

      <Form.TextArea
        id="notes"
        title="Notes"
        defaultValue={item.notes}
        placeholder="Add any notes about this fasting period"
      />
      <Form.Dropdown id="mood" title="Mood" defaultValue={item.mood}>
        <Form.Dropdown.Item title="-" value="-" />
        <Form.Dropdown.Item title="Good" value="good" />
        <Form.Dropdown.Item title="Neutral" value="neutral" />
        <Form.Dropdown.Item title="Bad" value="bad" />
      </Form.Dropdown>
    </Form>
  );
};
