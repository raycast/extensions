import fs from "fs";
import path from "path";
import os from "os";

/**
 * Retrieves the content of a specified context file.
 * Returns the content if the file exists, otherwise returns an error message.
 */
export default async function (input: {
  /**
   * The name of the context file to read (without .txt extension)
   */
  name: string;
}) {
  const contextsDir = path.join(os.homedir(), "Library/Application Support/ContextManager");
  const filePath = path.join(contextsDir, `${input.name}.txt`);

  try {
    if (!fs.existsSync(filePath)) {
      return `Context '${input.name}' not found`;
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return content;
  } catch (error) {
    return `Error reading context: ${String(error)}`;
  }
}
