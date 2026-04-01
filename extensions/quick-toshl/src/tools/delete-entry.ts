import { toshl } from "../utils/toshl";
import { AI_INSTRUCTIONS } from "../utils/helpers";

type Input = {
  entryId: string;
  /** For repeating entries: one | tail | all. Ignored for non-repeating. */
  deleteMode?: "one" | "tail" | "all";
};

export default async function deleteEntry(input: Input) {
  const entry = await toshl.getEntry(input.entryId);
  const mode = entry.repeat ? input.deleteMode || "one" : undefined;
  await toshl.deleteTransaction(entry.id, mode);
  return {
    success: true,
    message: "Entry deleted.",
    _instructions: AI_INSTRUCTIONS,
  };
}
