import { createCommentThread } from "../lib/api";
import { resolveToolSocialSetId } from "../lib/tool-helpers";
type Input = {
  draft_id: number;
  social_set_id?: number;
  selected_text: string;
  text: string;
  platform?: string;
  post_index?: number;
  occurrence?: number;
};
export default async function tool(input: Input) {
  if (input.platform === "x_article" && input.post_index !== undefined && input.post_index !== 0) {
    throw new Error("post_index must be 0 or omitted for X Article comments.");
  }
  if (input.platform !== "x_article" && input.post_index === undefined) {
    throw new Error("post_index is required for post comments.");
  }
  const socialSetId = await resolveToolSocialSetId(input.social_set_id);
  return createCommentThread(socialSetId, input.draft_id, {
    selected_text: input.selected_text,
    text: input.text,
    platform: input.platform,
    post_index: input.platform === "x_article" ? undefined : input.post_index,
    occurrence: input.occurrence,
  });
}
