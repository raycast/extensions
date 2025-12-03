import { writeFile, mkdir } from "node:fs/promises";
import { resolveAndValidatePath } from "../utils/workspace";
import { existsSync } from "node:fs";
import { dirname } from "node:path";

type Input = {
  /**
   * The relative path to the file from the workspace root
   */
  path: string;
  /**
   * The content to write to the new file
   */
  content: string;
  /**
   * Optional: Whether to overwrite if file already exists (default: false)
   */
  overwrite?: boolean;
};

export async function confirmation({ path, content, overwrite = false }: Input) {
  const filePath = resolveAndValidatePath(path);

  // Check if file already exists
  const fileExists = existsSync(filePath);

  // Truncate content for display
  const truncate = (text: string, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const info = [
    { name: "File Path", value: path },
    { name: "Action", value: fileExists ? (overwrite ? "Overwrite File" : "File Already Exists") : "Create File" },
    { name: "Content Length", value: `${content.length} characters` },
    { name: "Content Preview", value: truncate(content) },
  ];

  if (fileExists && !overwrite) {
    info.push({ name: "Warning", value: "File already exists. Set overwrite=true to replace it." });
  }

  return {
    message: `Are you sure you want to ${fileExists && overwrite ? "overwrite" : "create"} this file?`,
    info,
  };
}

export default async function ({ path, content, overwrite = false }: Input) {
  const filePath = resolveAndValidatePath(path);

  // Check if file already exists
  if (existsSync(filePath) && !overwrite) {
    throw new Error(`File already exists: ${path}. Set overwrite=true to replace it.`);
  }

  // Ensure parent directory exists
  const parentDir = dirname(filePath);
  await mkdir(parentDir, { recursive: true });

  // Write the file
  await writeFile(filePath, content, "utf8");

  return {
    success: true,
    message: `Successfully created file: ${path}`,
    contentLength: content.length,
  };
}
