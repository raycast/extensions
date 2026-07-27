import { Tool } from "@raycast/api";
import { deleteComment } from "../lib/api";
import { resolveToolSocialSetId } from "../lib/tool-helpers";
type Input = { draft_id: number; thread_id: string; comment_id?: string; social_set_id?: number };
export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: input.comment_id ? "Delete this comment?" : "Delete this entire comment thread?",
});
export default async function tool(input: Input) {
  const socialSetId = await resolveToolSocialSetId(input.social_set_id);
  await deleteComment(socialSetId, input.draft_id, input.thread_id, input.comment_id);
  return { success: true };
}
