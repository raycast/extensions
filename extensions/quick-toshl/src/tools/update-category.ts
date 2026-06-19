import { toshl } from "../utils/toshl";
import { AI_INSTRUCTIONS } from "../utils/helpers";

type Input = {
  categoryId: string;
  name: string;
  type: "expense" | "income";
};

export default async function updateCategory(input: Input) {
  const list = await toshl.getCategories();
  const existing = list.find((c) => c.id === input.categoryId);
  if (!existing?.modified) {
    return {
      success: false,
      message: "Category missing modified token — run list-categories-tags after toggling Force Refresh Cache.",
      _instructions: AI_INSTRUCTIONS,
    };
  }
  if (existing.type === "system") {
    return { success: false, message: "System categories cannot be updated via API.", _instructions: AI_INSTRUCTIONS };
  }
  const c = await toshl.updateCategory({
    id: input.categoryId,
    name: input.name.trim(),
    type: input.type,
    modified: existing.modified,
  });
  return {
    success: true,
    categoryId: c.id,
    name: c.name,
    _instructions: AI_INSTRUCTIONS,
  };
}
