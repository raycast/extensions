import { toshl } from "../utils/toshl";
import { AI_INSTRUCTIONS } from "../utils/helpers";

type Input = {
  tagId: string;
  name: string;
  type: "expense" | "income";
  categoryId?: string;
};

export default async function updateTag(input: Input) {
  const list = await toshl.getTags();
  const existing = list.find((t) => t.id === input.tagId);
  if (!existing?.modified) {
    return {
      success: false,
      message: "Tag missing modified token — refresh cache (extension preferences) and list tags again.",
      _instructions: AI_INSTRUCTIONS,
    };
  }
  const t = await toshl.updateTag({
    id: input.tagId,
    name: input.name.trim(),
    type: input.type,
    category: input.categoryId,
    modified: existing.modified,
  });
  return {
    success: true,
    tagId: t.id,
    name: t.name,
    _instructions: AI_INSTRUCTIONS,
  };
}
