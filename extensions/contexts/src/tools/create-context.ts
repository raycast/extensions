import fs from "fs";
import path from "path";
import os from "os";
import { Tool } from "@raycast/api";

type Input = {
  /**
   * The name for the new context file (without .txt extension)
   */
  name: string;
  /**
   * Optional initial content for the context file
   */
  content?: string;
};

/**
 * Creates a new context file.
 * If a context with the same name exists, returns an error.
 */
export default async function (input: Input) {
  const contextsDir = path.join(os.homedir(), "Library/Application Support/ContextManager");
  const filePath = path.join(contextsDir, `${input.name}.txt`);

  try {
    if (!fs.existsSync(contextsDir)) {
      fs.mkdirSync(contextsDir, { recursive: true });
    }

    if (fs.existsSync(filePath)) {
      return `Context '${input.name}' already exists`;
    }

    fs.writeFileSync(filePath, input.content || "", "utf-8");
    return `Successfully created context '${input.name}'`;
  } catch (error) {
    return `Error creating context: ${String(error)}`;
  }
}

/**
 * Request confirmation before creating a new context
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    info: [
      { name: "New Context Name", value: input.name },
      ...(input.content ? [{ name: "Initial Content", value: input.content }] : []),
    ],
  };
};
