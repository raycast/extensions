import { toshl } from "../utils/toshl";
import { AI_INSTRUCTIONS } from "../utils/helpers";

type Input = {
  tagId: string;
};

export default async function deleteTag(input: Input) {
  await toshl.deleteTag(input.tagId.trim());
  return {
    success: true,
    message: "Tag deleted.",
    _instructions: AI_INSTRUCTIONS,
  };
}
