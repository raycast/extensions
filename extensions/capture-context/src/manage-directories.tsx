import { Form, ActionPanel, Action, showToast, Toast, openExtensionPreferences, Icon } from "@raycast/api";
import { useState } from "react";
import { CONFIG } from "./utils";

export default function Command() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    try {
      setIsSubmitting(true);
      await showToast({ style: Toast.Style.Success, title: "Opening preferences..." });
      await openExtensionPreferences();
    } catch (error) {
      console.error("Failed to update directories:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Update Directories",
        message: String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm title="Open Extension Preferences" onSubmit={handleSubmit} icon={Icon.Gear} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.ShowInFinder
              title="Open Screenshots Directory"
              path={CONFIG.screenshotsDir}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
            <Action.ShowInFinder
              title="Open Capture Directory"
              path={CONFIG.saveDir}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description
        title="Current Configuration"
        text="These are your current capture directory settings. Use ⌘K to update or view them."
      />

      <Form.Description title="Screenshots Directory" text={`${CONFIG.screenshotsDir}\n\nUse ⌘S to open in Finder`} />

      <Form.Separator />

      <Form.Description title="Capture Directory" text={`${CONFIG.saveDir}\n\nUse ⌘C to open in Finder`} />

      <Form.Separator />

      <Form.Description title="Note" text="Changes will take effect immediately across all commands." />
    </Form>
  );
}
