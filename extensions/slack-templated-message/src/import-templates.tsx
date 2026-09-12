/**
 * Import templates command that allows users to import templates from a JSON file.
 * Supports merging with existing templates and handling duplicates.
 */
import React, { useState } from "react";
import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { SlackTemplate } from "./types";
import {
  loadTemplates,
  saveTemplates,
  DEFAULT_TEMPLATE_PATH,
  readTemplatesFromFile,
  handleOperationError,
} from "./lib/templates";

interface FormValues {
  filePath: string;
  overwrite: boolean;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [filePath, setFilePath] = useState<string>(DEFAULT_TEMPLATE_PATH);

  /**
   * Merges imported templates with existing ones based on the overwrite flag
   * @param importedTemplates - Templates being imported from file
   * @param existingTemplates - Templates already in the system
   * @param overwrite - Whether to overwrite existing templates with the same name
   * @returns Merged array of templates
   */
  function mergeTemplates(importedTemplates: SlackTemplate[], existingTemplates: SlackTemplate[], overwrite: boolean) {
    if (overwrite) {
      // If overwrite is true, keep existing templates that don't conflict with imported ones
      const uniqueExisting = existingTemplates.filter((t) => !importedTemplates.some((it) => it.name === t.name));
      return [...uniqueExisting, ...importedTemplates];
    } else {
      // If overwrite is false, only add imported templates that don't exist yet
      const existingNames = new Set(existingTemplates.map((t) => t.name));
      const uniqueImported = importedTemplates.filter((t) => !existingNames.has(t.name));
      return [...existingTemplates, ...uniqueImported];
    }
  }

  /**
   * Handles the import action:
   * 1. Reads templates from the specified file
   * 2. Loads existing templates
   * 3. Merges them according to the overwrite setting
   * 4. Saves the combined templates
   */
  async function handleSubmit(values: FormValues) {
    setIsLoading(true);
    try {
      const importedTemplates = await readTemplatesFromFile(values.filePath);
      const existingTemplates = await loadTemplates();
      const newTemplates = await mergeTemplates(importedTemplates, existingTemplates, values.overwrite);

      await saveTemplates(newTemplates);
      await showToast({
        style: Toast.Style.Success,
        title: "Import successful",
        message: `Imported ${importedTemplates.length} templates`,
      });
    } catch (error) {
      await handleOperationError(error, "import");
    } finally {
      setIsLoading(false);
    }
  }

  // Render import form with file path input and overwrite option
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={"Specify a JSON file to import."} />
      <Form.TextField
        id="filePath"
        title="File Path"
        placeholder={DEFAULT_TEMPLATE_PATH}
        value={filePath}
        onChange={setFilePath}
      />
      <Form.Checkbox id="overwrite" label="Update duplicate Items" defaultValue={false} />
    </Form>
  );
}
