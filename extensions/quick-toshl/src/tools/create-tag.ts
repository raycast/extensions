import { toshl } from "../utils/toshl";
import { AI_INSTRUCTIONS } from "../utils/helpers";

type Input = {
  name: string;
  type: "expense" | "income";
  categoryId?: string;
};

export default async function createTag(input: Input) {
  const t = await toshl.createTag({
    name: input.name.trim(),
    type: input.type,
    category: input.categoryId,
  });
  return {
    success: true,
    tagId: t.id,
    name: t.name,
    _instructions: AI_INSTRUCTIONS,
  };
}
