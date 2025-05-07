/**
 * Export templates command that allows users to export their templates to a JSON file.
 * Templates will be saved to the user's Downloads directory by default.
 */
import React, { useEffect, useState } from "react";
import { Action, ActionPanel, List, showToast, Toast, confirmAlert } from "@raycast/api";
import { SlackTemplate } from "./types";
import {
  loadTemplates,
  DEFAULT_TEMPLATE_PATH,
  checkFileExists,
  writeTemplatesToFile,
  handleOperationError,
} from "./lib/templates";

export default function Command() {
  const [templates, setTemplates] = useState<SlackTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing templates when the component mounts
  useEffect(() => {
    loadTemplates()
      .then(setTemplates)
      .catch(async (error) => {
        await handleOperationError(error, "export");
      })
      .finally(() => setIsLoading(false));
  }, []);

  /**
   * Handles the export action:
   * 1. Checks if the file already exists
   * 2. If it exists, asks for confirmation to overwrite
   * 3. Writes templates to the specified file
   */
  async function handleExport() {
    try {
      const fileExists = await checkFileExists(DEFAULT_TEMPLATE_PATH);

      // Show confirmation dialog if file already exists
      if (fileExists) {
        const shouldOverwrite = await confirmAlert({
          title: "File already exists",
          message: `Do you want to overwrite ${DEFAULT_TEMPLATE_PATH}?`,
          primaryAction: {
            title: "Overwrite",
          },
          dismissAction: {
            title: "Cancel",
          },
        });

        if (!shouldOverwrite) {
          return;
        }
      }

      await writeTemplatesToFile(DEFAULT_TEMPLATE_PATH, templates);
      await showToast({
        style: Toast.Style.Success,
        title: "Export successful",
        message: `Exported ${templates.length} templates to ${DEFAULT_TEMPLATE_PATH}`,
      });
    } catch (error) {
      await handleOperationError(error, "export");
    }
  }

  // Render a single list item with export action or empty state
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Export templates">
      {templates.length > 0 ? (
        <List.Item
          title={`Export ${templates.length} templates`}
          subtitle={`Save to: ${DEFAULT_TEMPLATE_PATH}`}
          actions={
            <ActionPanel>
              <Action title="Export" onAction={handleExport} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          title="No Templates Available"
          description="Create some templates first before using the export feature."
        />
      )}
    </List>
  );
}
