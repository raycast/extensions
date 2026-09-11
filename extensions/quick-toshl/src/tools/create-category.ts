import { toshl } from "../utils/toshl";
import { AI_INSTRUCTIONS } from "../utils/helpers";

type Input = {
  name: string;
  type: "expense" | "income";
};

export default async function createCategory(input: Input) {
  const c = await toshl.createCategory({ name: input.name.trim(), type: input.type });
  return {
    success: true,
    categoryId: c.id,
    name: c.name,
    _instructions: AI_INSTRUCTIONS,
  };
}
