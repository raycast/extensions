import { Tool } from "@raycast/api";
import { resolveCommentThread } from "../lib/api";
import { resolveToolSocialSetId } from "../lib/tool-helpers";
type Input = { draft_id: number; thread_id: string; social_set_id?: number };
export const confirmation: Tool.Confirmation<Input> = async () => ({
  message: "Resolve this comment thread? Its anchor will be removed.",
});
export default async function tool(input: Input) {
  return resolveCommentThread(await resolveToolSocialSetId(input.social_set_id), input.draft_id, input.thread_id);
}
