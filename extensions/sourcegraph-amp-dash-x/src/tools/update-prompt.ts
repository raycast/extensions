import { updatePrompt, getPrompts } from "../lib/storage";

export type Input = {
  /** Prompt id to update. If not provided, tries to find by exact title. */
  id?: string;
  /** Exact prompt title when id is unknown. */
  title?: string;
  /** New title */
  newTitle?: string;
  /** New prompt text */
  prompt?: string;
  /** New category */
  category?: string;
  /** New description (set empty string to clear) */
  description?: string;
};

/**
 * Update fields of a saved prompt by id or title.
 */
export default async function tool(input: Input) {
  try {
    const targetId = await resolveId(input);
    if (!targetId)
      return "Error: Provide `id` or exact `title` of the prompt to update.";

    const updates: Record<string, unknown> = {};
    if (typeof input.newTitle === "string")
      updates.title = input.newTitle.trim();
    if (typeof input.prompt === "string") updates.prompt = input.prompt.trim();
    if (typeof input.category === "string")
      updates.category = input.category.trim();
    if (typeof input.description === "string")
      updates.description = input.description.trim();

    if (Object.keys(updates).length === 0) return "Nothing to update.";

    const updated = await updatePrompt(targetId, updates);
    if (!updated) return "Error: Prompt not found.";

    return `Updated prompt: "${updated.title}" (Category: ${updated.category})`;
  } catch (err) {
    return `Error updating prompt: ${String(err)}`;
  }
}

async function resolveId(input: Input): Promise<string | null> {
  if (input.id) return input.id;
  if (input.title) {
    const all = await getPrompts();
    const p = all.find(
      (x) => x.title.toLowerCase() === input.title!.toLowerCase(),
    );
    return p?.id ?? null;
  }
  return null;
}
