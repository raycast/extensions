import { deletePrompt, getPrompts } from "../lib/storage";
import type { Tool } from "@raycast/api";

export type Input = {
  /** Prompt id to delete. If not provided, tries to find by exact title. */
  id?: string;
  /** Exact title match if id unknown. */
  title?: string;
};

/**
 * Delete a saved prompt by id or title.
 */
export default async function tool(input: Input) {
  try {
    const id = await resolveId(input);
    if (!id)
      return "Error: Provide `id` or exact `title` of the prompt to delete.";

    const ok = await deletePrompt(id);
    return ok ? "Prompt deleted." : "Error: Prompt not found.";
  } catch (err) {
    return `Error deleting prompt: ${String(err)}`;
  }
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (input.id || input.title) {
    return {
      message: `Delete prompt ${input.title ? '"' + input.title + '"' : "(by id)"}?`,
    };
  }
  return { message: "Delete prompt?" };
};

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
