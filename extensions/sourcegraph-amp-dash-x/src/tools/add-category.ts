import { saveCategory } from "../lib/storage";

export type Input = {
  /** New category name. */
  name: string;
};

/**
 * Add a new prompt category. Returns a status message.
 */
export default async function tool(input: Input) {
  try {
    const name = (input.name || "").trim();
    if (!name) return "Error: `name` is required.";

    const ok = await saveCategory(name);
    return ok ? `Category added: ${name}` : "Category already exists.";
  } catch (err) {
    return `Error adding category: ${String(err)}`;
  }
}
