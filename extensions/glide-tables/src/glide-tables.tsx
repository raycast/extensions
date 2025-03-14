import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import * as glide from "@glideapps/tables";

// Define our preferences interface
interface Preferences {
  glideToken: string;
  glideAppId: string;
  glideTableId: string;
}

// Command to add a row to a Glide table
export default function Command() {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Get API credentials from preferences
  const preferences = getPreferenceValues<Preferences>();

  // Handle form submission
  async function handleSubmit(values: { name: string }) {
    if (!values.name) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Create a table instance including the columns mapping
      const glideTable = glide.table({
        token: preferences.glideToken,
        app: preferences.glideAppId,
        table: preferences.glideTableId,
        columns: {
          name: { type: "string", name: "Name" },
        },
      });

      // Add a row to the table without storing the unused result
      await glideTable.add({
        name: values.name,
      });

      // Show success message
      await showToast({
        style: Toast.Style.Success,
        title: "Row added successfully",
        message: `Added "${values.name}" to your Glide table`,
      });

      // Reset form
      setName("");
    } catch (error) {
      console.error("Error adding row:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add row",
        message: errorMsg,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Row" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.TextField id="name" title="Name" placeholder="Enter name" value={name} onChange={setName} autoFocus />
    </Form>
  );
}
