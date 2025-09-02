import { deleteCategory } from "../lib/storage";
import type { Tool } from "@raycast/api";

export type Input = {
  /** Category name to delete. "General" cannot be deleted. */
  name: string;
};

/**
 * Delete a prompt category. Prompts in that category will be moved to "General".
 */
export default async function tool(input: Input) {
  try {
    const name = (input.name || "").trim();
    if (!name) return "Error: `name` is required.";
    const ok = await deleteCategory(name);
    return ok ? `Deleted category: ${name}` : "Failed to delete category.";
  } catch (err) {
    return `Error deleting category: ${String(err)}`;
  }
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (!input?.name) return { message: "Delete category?" };
  return {
    message: `Delete category "${input.name}"? Prompts will be moved to "General".`,
  };
};
