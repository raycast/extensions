import fs from "fs";
import path from "path";
import os from "os";
import { Tool } from "@raycast/api";

type Input = {
  /**
   * The name of the context file to delete (without .txt extension)
   */
  name: string;
};

/**
 * Deletes a specified context file.
 * Confirms the deletion with the user before proceeding.
 */
export default async function (input: Input) {
  const contextsDir = path.join(os.homedir(), "Library/Application Support/ContextManager");
  const filePath = path.join(contextsDir, `${input.name}.txt`);

  try {
    if (!fs.existsSync(filePath)) {
      return `Context '${input.name}' not found`;
    }
    fs.unlinkSync(filePath);
    return `Successfully deleted context '${input.name}'`;
  } catch (error) {
    return `Error deleting context: ${String(error)}`;
  }
}

/**
 * Request confirmation before deleting the context
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    info: [{ name: "Context to Delete", value: input.name }],
  };
};
