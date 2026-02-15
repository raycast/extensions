import path from "node:path";
import { Tool } from "@raycast/api";
import {
  convertHtmlToFile,
  createOutputFilePath,
  ensureDirectory,
  resolveOutputDirectory,
  toErrorMessage,
  type FileType,
} from "../lib/documents";

type Input = {
  /**
   * HTML markup used to render the document body.
   */
  html: string;
  /**
   * Optional CSS styles applied before conversion.
   */
  css?: string;
  /**
   * Output file type.
   */
  fileType: FileType;
  /**
   * Optional output file name (with or without extension).
   */
  fileName?: string;
  /**
   * Absolute directory path where the file should be saved.
   */
  outputDirectory: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const outputDirectory = resolveOutputDirectory(input.outputDirectory);
  const fileType = input.fileType.toUpperCase();

  return {
    message: `Create ${fileType} file in ${outputDirectory}?`,
    info: [
      { name: "Type", value: fileType },
      { name: "Name", value: input.fileName?.trim() || "Auto-generated" },
    ],
  };
};

export default async function generateDocument(input: Input): Promise<string> {
  const outputDirectory = resolveOutputDirectory(input.outputDirectory);
  await ensureDirectory(outputDirectory);

  const outputPath = createOutputFilePath({
    outputDirectory,
    fileType: input.fileType,
    fileName: input.fileName,
  });

  try {
    await convertHtmlToFile({
      html: input.html,
      css: input.css,
      fileType: input.fileType,
      outputPath,
    });
  } catch (error) {
    throw new Error(`Failed to create ${input.fileType.toUpperCase()} file: ${toErrorMessage(error)}`);
  }

  return `Created ${path.basename(outputPath)} at ${outputPath}`;
}
