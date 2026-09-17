import { updateComment } from "../lib/api";
import { resolveToolSocialSetId } from "../lib/tool-helpers";
type Input = { draft_id: number; thread_id: string; comment_id: string; text: string; social_set_id?: number };
export default async function tool(input: Input) {
  return updateComment(
    await resolveToolSocialSetId(input.social_set_id),
    input.draft_id,
    input.thread_id,
    input.comment_id,
    input.text,
  );
}
