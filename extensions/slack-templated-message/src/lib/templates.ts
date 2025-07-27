/**
 * Template management module.
 * Handles storage, validation, and operations for message templates.
 */
import { Toast, showToast } from "@raycast/api";
import { environment } from "@raycast/api";
import { homedir } from "os";
import { join } from "path";
import fs from "fs/promises";
import { SlackTemplate } from "../types";
import { showCustomToast } from "./slack";

/** File system constants */
const TEMPLATES_FILENAME = "slack-templates.json";
const templatesFilePath = join(environment.supportPath, TEMPLATES_FILENAME);
export const DEFAULT_TEMPLATE_PATH = join(homedir(), "Downloads", "slack-templates.json");

/**
 * Ensures the storage directory exists
 * @throws Error if directory creation fails
 */
async function ensureStorageDirectory(): Promise<void> {
  try {
    await fs.mkdir(environment.supportPath, { recursive: true });
  } catch (error) {
    console.error("Failed to create storage directory:", error);
    throw error;
  }
}

/**
 * Loads templates from the local storage file
 * @returns Promise<SlackTemplate[]> Array of stored templates
 * @throws Error if file reading fails
 */
async function loadTemplatesFromFile(): Promise<SlackTemplate[]> {
  try {
    await ensureStorageDirectory();
    const data = await fs.readFile(templatesFilePath, "utf-8");
    try {
      return JSON.parse(data);
    } catch (parseError) {
      console.error("Failed to parse templates JSON:", parseError);
      throw new Error("Invalid template file format");
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    console.error("Failed to load templates from file:", error);
    throw error;
  }
}

/**
 * Saves templates to the local storage file
 * @param templates - Array of templates to save
 * @throws Error if file writing fails
 */
async function saveTemplatesToFile(templates: SlackTemplate[]): Promise<void> {
  try {
    await ensureStorageDirectory();
    await fs.writeFile(templatesFilePath, JSON.stringify(templates, null, 2));
  } catch (error) {
    console.error("Failed to save templates to file:", error);
    throw error;
  }
}

/**
 * Validates the format of imported templates
 * @param templates - Unknown data to validate
 * @returns Promise<SlackTemplate[]> Validated templates array
 * @throws Error if validation fails
 */
export async function validateTemplateFormat(templates: unknown): Promise<SlackTemplate[]> {
  if (!Array.isArray(templates)) {
    throw new Error("Invalid template format: expected an array");
  }

  const importedTemplates = templates as SlackTemplate[];

  const isValid = importedTemplates.every(
    (template) =>
      typeof template.name === "string" &&
      typeof template.message === "string" &&
      typeof template.slackChannelId === "string" &&
      typeof template.slackChannelName === "string" &&
      (template.threadTimestamp === undefined || typeof template.threadTimestamp === "string"),
  );

  if (!isValid) {
    throw new Error("Invalid template format");
  }

  return importedTemplates;
}

/**
 * Checks if a file exists at the specified path
 * @param filePath - Path to check
 * @returns Promise<boolean> True if file exists
 */
export async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("ENOENT")) {
      return false;
    }
    throw error;
  }
}

/**
 * Reads templates from a specified JSON file
 * @param filePath - Path to the JSON file
 * @returns Promise<SlackTemplate[]> Array of templates from file
 * @throws Error if file reading or validation fails
 */
export async function readTemplatesFromFile(filePath: string): Promise<SlackTemplate[]> {
  if (!filePath) {
    throw new Error("Please enter a file path");
  }

  if (!filePath.toLowerCase().endsWith(".json")) {
    throw new Error("Please select a JSON file");
  }

  const fileContent = await fs.readFile(filePath, "utf8");
  const parsedContent = JSON.parse(fileContent);
  return await validateTemplateFormat(parsedContent);
}

/**
 * Writes templates to a specified file
 * @param filePath - Path to write the file
 * @param templates - Templates to write
 */
export async function writeTemplatesToFile(filePath: string, templates: SlackTemplate[]): Promise<void> {
  try {
    await fs.writeFile(filePath, JSON.stringify(templates, null, 2));
  } catch (error) {
    await showCustomToast({
      style: Toast.Style.Failure,
      title: "Failed to write to file",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Handles operation errors with appropriate toast notifications
 * @param error - Error to handle
 * @param operation - Type of operation that failed
 */
export async function handleOperationError(error: unknown, operation: "import" | "export"): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: `${operation === "import" ? "Import" : "Export"} failed`,
    message: error instanceof Error ? error.message : "Unknown error occurred",
  });
}

/**
 * Loads all templates from storage
 * @returns Promise<SlackTemplate[]> Array of stored templates
 */
export async function loadTemplates(): Promise<SlackTemplate[]> {
  try {
    return await loadTemplatesFromFile();
  } catch (error) {
    await showCustomToast({
      style: Toast.Style.Failure,
      title: "Failed to load templates",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return [];
  }
}

/**
 * Updates an existing template
 * @param updatedTemplate - New template data
 * @param originalName - Name of the template to update
 * @throws Error if update fails
 */
export async function updateTemplate(updatedTemplate: SlackTemplate, originalName: string): Promise<void> {
  try {
    const templates = await loadTemplatesFromFile();
    const updatedTemplates = templates.map((t) => (t.name === originalName ? updatedTemplate : t));
    await saveTemplatesToFile(updatedTemplates);

    await showCustomToast({
      style: Toast.Style.Success,
      title: "Template updated successfully",
    });
  } catch (error) {
    await showCustomToast({
      style: Toast.Style.Failure,
      title: "Failed to update template",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Deletes a template by name
 * @param templateName - Name of the template to delete
 * @returns Promise<SlackTemplate[]> Updated templates array
 * @throws Error if deletion fails
 */
export async function deleteTemplate(templateName: string): Promise<SlackTemplate[]> {
  try {
    const templates = await loadTemplates();
    const updatedTemplates = templates.filter((t) => t.name !== templateName);
    await saveTemplatesToFile(updatedTemplates);

    await showCustomToast({
      style: Toast.Style.Success,
      title: "Template deleted successfully",
    });

    return updatedTemplates;
  } catch (error) {
    await showCustomToast({
      style: Toast.Style.Failure,
      title: "Failed to delete template",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

/**
 * Saves multiple templates to storage
 * @param templates - Array of templates to save
 * @throws Error if save operation fails
 */
export async function saveTemplates(templates: SlackTemplate[]): Promise<void> {
  try {
    await saveTemplatesToFile(templates);
  } catch (error) {
    await showCustomToast({
      style: Toast.Style.Failure,
      title: "Failed to save templates",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
