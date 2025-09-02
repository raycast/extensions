import { updateCategory } from "../lib/storage";

export type Input = {
  /** Existing category name to rename. */
  oldName: string;
  /** New category name. */
  newName: string;
};

/**
 * Rename a prompt category.
 */
export default async function tool(input: Input) {
  try {
    const oldName = (input.oldName || "").trim();
    const newName = (input.newName || "").trim();
    if (!oldName || !newName)
      return "Error: `oldName` and `newName` are required.";

    const ok = await updateCategory(oldName, newName);
    return ok
      ? `Renamed category: ${oldName} → ${newName}`
      : "Failed to rename category (exists or invalid).";
  } catch (err) {
    return `Error updating category: ${String(err)}`;
  }
}
