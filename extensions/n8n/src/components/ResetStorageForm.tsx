import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { resetAllStorageData, resetSavedCommands, resetSavedFilters } from "../utils/reset-utils";

export default function ResetStorageForm() {
  const { pop } = useNavigation();
  const [isResetting, setIsResetting] = useState(false);

  async function handleResetAll() {
    setIsResetting(true);
    try {
      await resetAllStorageData();
      pop(); // Close form after successful reset
    } catch (error) {
      // Error is already shown by the reset function
      console.error("Reset all failed:", error);
    } finally {
      setIsResetting(false);
    }
  }

  async function handleResetCommands() {
    setIsResetting(true);
    try {
      await resetSavedCommands();
      pop(); // Close form after successful reset
    } catch (error) {
      // Error is already shown by the reset function
      console.error("Reset commands failed:", error);
    } finally {
      setIsResetting(false);
    }
  }

  async function handleResetFilters() {
    setIsResetting(true);
    try {
      await resetSavedFilters();
      pop(); // Close form after successful reset
    } catch (error) {
      // Error is already shown by the reset function
      console.error("Reset filters failed:", error);
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <Form
      isLoading={isResetting}
      navigationTitle="Reset Storage Data"
      actions={
        <ActionPanel>
          <Action
            title="Reset All Data"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={handleResetAll}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          />
          <Action
            title="Reset Commands Only"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={handleResetCommands}
          />
          <Action
            title="Reset Filters Only"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={handleResetFilters}
          />
          <Action title="Cancel" icon={Icon.XmarkCircle} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Reset Storage Data"
        text="Use this form to reset storage data if you're experiencing issues with the extension. This will clear saved commands, filters, and other preferences."
      />
      <Form.Separator />
      <Form.Description
        title="Warning"
        text="This action cannot be undone. All saved data will be permanently deleted."
      />
      <Form.Description text="Select an action from the Action Panel (⌘K) to proceed with reset." />
    </Form>
  );
}
