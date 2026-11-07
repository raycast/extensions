import { executeWrite, writeConfirmation } from "../lib/ai-write";

type Input = {
  /** The specific Finder tags to remove. Other tags are kept. */
  tags: string[];
  /** Absolute file paths. Omit or pass an empty array to use the Finder selection. */
  paths?: string[];
};

export const confirmation = writeConfirmation("remove");

/** Remove tags from the exact files previewed in the confirmation. */
export default async function tool(input: Input) {
  return executeWrite("remove", input);
}
