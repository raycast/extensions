import fs from "fs";
import path from "path";
import os from "os";
import { Tool } from "@raycast/api";

type Input = {
  /**
   * The name of the context file (without .txt extension)
   */
  name: string;
  /**
   * The text content to append to the context file
   */
  content: string;
};

/**
 * Appends text content to a specified context file.
 * Always check if the context exists first using list-contexts.
 */
export default async function (input: Input) {
  const contextsDir = path.join(os.homedir(), "Library/Application Support/ContextManager");
  const filePath = path.join(contextsDir, `${input.name}.txt`);

  try {
    if (!fs.existsSync(filePath)) {
      return `Context '${input.name}' not found`;
    }
    fs.appendFileSync(filePath, `\n${input.content}`, "utf-8");
    return `Successfully appended to context '${input.name}'`;
  } catch (error) {
    return `Error appending to context: ${String(error)}`;
  }
}

/**
 * Request confirmation before appending to the context
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    info: [
      { name: "Context", value: input.name },
      { name: "Content to append", value: input.content },
    ],
  };
};
