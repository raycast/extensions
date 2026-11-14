import { executeWrite, writeConfirmation } from "../lib/ai-write";

type Input = {
  /** Finder tag names to add. Reuse the spelling returned by list-tags. */
  tags: string[];
  /** Absolute file paths. Omit or pass an empty array to use the Finder selection. */
  paths?: string[];
};

export const confirmation = writeConfirmation("add");

/** Add tags to the exact files previewed in the confirmation, preserving all other tags. */
export default async function tool(input: Input) {
  return executeWrite("add", input);
}
