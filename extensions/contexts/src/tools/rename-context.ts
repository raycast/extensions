import fs from "fs";
import path from "path";
import os from "os";
import { Tool } from "@raycast/api";

type Input = {
  /**
   * The current name of the context file (without .txt extension)
   */
  oldName: string;
  /**
   * The new name for the context file (without .txt extension)
   */
  newName: string;
};

/**
 * Renames a specified context file.
 * Checks if the source exists and the target name isn't already taken.
 */
export default async function (input: Input) {
  const contextsDir = path.join(os.homedir(), "Library/Application Support/ContextManager");
  const oldPath = path.join(contextsDir, `${input.oldName}.txt`);
  const newPath = path.join(contextsDir, `${input.newName}.txt`);

  try {
    if (!fs.existsSync(oldPath)) {
      return `Context '${input.oldName}' not found`;
    }
    if (fs.existsSync(newPath)) {
      return `Context '${input.newName}' already exists`;
    }
    fs.renameSync(oldPath, newPath);
    return `Successfully renamed context '${input.oldName}' to '${input.newName}'`;
  } catch (error) {
    return `Error renaming context: ${String(error)}`;
  }
}

/**
 * Request confirmation before renaming the context
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    info: [
      { name: "Current Name", value: input.oldName },
      { name: "New Name", value: input.newName },
    ],
  };
};
