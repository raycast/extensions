import { Tool } from "@raycast/api";
import { runSoulverJson } from "../utils/soulver-cli";

type Input = {
  /** Action to perform on global variables */
  action: "list" | "set" | "delete";
  /** Variable identifier name (required for set/delete) */
  name?: string;
  /** Variable value string (e.g. "85 USD") (required for set) */
  value?: string;
  /** Optional path to a specific .sheetbook file */
  sheetbookPath?: string;
};

/**
 * Lists, sets, or deletes global variables in the Soulver sheetbook.
 */
export default async function tool(input: Input) {
  const args = ["variable", input.action];

  if (input.action === "set") {
    if (!input.name || !input.value) {
      throw new Error("Variable name and value are required when setting a variable");
    }
    args.push(input.name, input.value);
  } else if (input.action === "delete") {
    if (!input.name) {
      throw new Error("Variable name is required when deleting a variable");
    }
    args.push(input.name);
  }

  if (input.sheetbookPath) {
    args.push("--path", input.sheetbookPath);
  }

  return await runSoulverJson(args);
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (input.action === "set") {
    return {
      message: `Are you sure you want to set global variable "${input.name}" to "${input.value}"?`,
    };
  }
  if (input.action === "delete") {
    return {
      message: `Are you sure you want to delete global variable "${input.name}"?`,
    };
  }
  return false;
};
