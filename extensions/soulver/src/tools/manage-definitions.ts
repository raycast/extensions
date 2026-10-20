import { Tool } from "@raycast/api";
import { runSoulverJson } from "../utils/soulver-cli";

type Input = {
  /** Action to perform on definitions */
  action: "show" | "append";
  /** Definition text to append (e.g. "story = 3.5 m") */
  text?: string;
  /** Optional path to a specific .sheetbook file */
  sheetbookPath?: string;
};

/**
 * Shows or appends custom unit/constant definitions in Soulver.
 */
export default async function tool(input: Input) {
  const args = ["definition"];

  if (input.action === "show") {
    args.push("show");
  } else if (input.action === "append") {
    if (!input.text) {
      throw new Error("Definition text is required when appending a definition");
    }
    args.push("append", input.text);
  }

  if (input.sheetbookPath) {
    args.push("--path", input.sheetbookPath);
  }

  return await runSoulverJson(args);
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (input.action === "append") {
    return {
      message: `Are you sure you want to add custom definition "${input.text}"?`,
    };
  }
  return undefined;
};
