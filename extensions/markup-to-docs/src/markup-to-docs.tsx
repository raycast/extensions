import { Action, ActionPanel, Form, Toast, showToast } from "@raycast/api";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { useState } from "react";
import {
  convertHtmlToFile,
  createOutputFilePath,
  ensureDirectory,
  resolveOutputDirectory,
  toErrorMessage,
  type FileType,
} from "./lib/documents";

type ManualFormValues = {
  htmlFile: string[];
  cssFile: string[];
  fileType: FileType;
  outputDirectory: string[];
  fileName: string;
};

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: ManualFormValues) {
    setIsLoading(true);

    try {
      const htmlFilePath = values.htmlFile?.[0];
      const outputDirectoryPath = values.outputDirectory?.[0];

      if (!htmlFilePath) {
        throw new Error("Select an HTML file");
      }

      if (!outputDirectoryPath) {
        throw new Error("Select an output folder");
      }

      const html = await readFile(htmlFilePath, "utf8");
      const cssFilePath = values.cssFile?.[0];
      const css = cssFilePath ? await readFile(cssFilePath, "utf8") : undefined;

      const outputDirectory = resolveOutputDirectory(outputDirectoryPath);
      await ensureDirectory(outputDirectory);

      const fallbackName = path.basename(htmlFilePath, path.extname(htmlFilePath));
      const outputPath = createOutputFilePath({
        outputDirectory,
        fileType: values.fileType,
        fileName: values.fileName?.trim() || fallbackName,
      });

      await convertHtmlToFile({
        html,
        css,
        fileType: values.fileType,
        outputPath,
      });

      await showToast({
        style: Toast.Style.Success,
        title: `Created ${path.basename(outputPath)}`,
        message: outputPath,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not create document",
        message: toErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Document" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="htmlFile"
        title="HTML File"
        canChooseFiles
        canChooseDirectories={false}
        allowMultipleSelection={false}
      />
      <Form.FilePicker
        id="cssFile"
        title="CSS File (Optional)"
        canChooseFiles
        canChooseDirectories={false}
        allowMultipleSelection={false}
      />
      <Form.Dropdown id="fileType" title="Output Type" defaultValue="pdf">
        <Form.Dropdown.Item value="pdf" title="PDF" />
        <Form.Dropdown.Item value="docx" title="DOCX" />
        <Form.Dropdown.Item value="odt" title="ODT" />
        <Form.Dropdown.Item value="rtf" title="RTF" />
      </Form.Dropdown>
      <Form.FilePicker
        id="outputDirectory"
        title="Output Folder"
        canChooseFiles={false}
        canChooseDirectories
        allowMultipleSelection={false}
      />
      <Form.TextField id="fileName" title="File Name (Optional)" placeholder="Example: project-summary" />
    </Form>
  );
}
