import { toshl } from "../utils/toshl";
import { AI_INSTRUCTIONS } from "../utils/helpers";

type Input = {
  categoryId: string;
};

export default async function deleteCategory(input: Input) {
  await toshl.deleteCategory(input.categoryId.trim());
  return {
    success: true,
    message: "Category deleted.",
    _instructions: AI_INSTRUCTIONS,
  };
}
