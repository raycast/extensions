import { readFile, writeFile } from "node:fs/promises";
import { resolveAndValidatePath } from "../utils/workspace";

type Input = {
  /**
   * The relative path to the file from the workspace root
   */
  path: string;
  /**
   * The original text to be replaced (must match exactly)
   */
  oldText: string;
  /**
   * The new text to replace with
   */
  newText: string;
  /**
   * Optional: Whether to replace all occurrences (default: false, only replaces first occurrence)
   */
  replaceAll?: boolean;
};

export async function confirmation({ path, oldText, newText, replaceAll = false }: Input) {
  const filePath = resolveAndValidatePath(path);
  const content = await readFile(filePath, "utf8");

  // Check if the old text exists in the file
  if (!content.includes(oldText)) {
    throw new Error(`Could not find the specified text in the file: "${oldText.substring(0, 50)}..."`);
  }

  // Count occurrences
  const occurrences = content.split(oldText).length - 1;
  const willReplace = replaceAll ? occurrences : 1;

  // Truncate text for display
  const truncate = (text: string, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return {
    message: `Are you sure you want to replace text in ${path}?`,
    info: [
      { name: "File Path", value: path },
      { name: "Replace Mode", value: replaceAll ? `Replace All (${occurrences} occurrences)` : "Replace First Only" },
      { name: "Will Replace", value: `${willReplace} occurrence${willReplace > 1 ? "s" : ""}` },
      { name: "Old Text", value: truncate(oldText) },
      { name: "New Text", value: truncate(newText) },
    ],
  };
}

export default async function ({ path, oldText, newText, replaceAll = false }: Input) {
  if (!oldText) {
    throw new Error("oldText is required");
  }

  const filePath = resolveAndValidatePath(path);
  const content = await readFile(filePath, "utf8");

  // Check if the old text exists in the file
  if (!content.includes(oldText)) {
    throw new Error(`Could not find the specified text in the file: "${oldText.substring(0, 50)}..."`);
  }

  // Perform the replacement
  let updatedContent: string;
  if (replaceAll) {
    // Replace all occurrences
    updatedContent = content.split(oldText).join(newText);
  } else {
    // Replace only the first occurrence
    const index = content.indexOf(oldText);
    updatedContent = content.substring(0, index) + newText + content.substring(index + oldText.length);
  }

  // Write the updated content back to the file
  await writeFile(filePath, updatedContent, "utf8");

  return {
    success: true,
    message: `Successfully applied edit to ${path}`,
    replacedOccurrences: replaceAll ? content.split(oldText).length - 1 : 1,
  };
}
