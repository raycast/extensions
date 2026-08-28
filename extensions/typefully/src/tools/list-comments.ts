import { listCommentThreads } from "../lib/api";
import { resolveToolSocialSetId } from "../lib/tool-helpers";
type Input = {
  draft_id: number;
  social_set_id?: number;
  platform?: string;
  status?: "unresolved" | "resolved" | "all";
  limit?: number;
  offset?: number;
};
export default async function tool(input: Input) {
  return listCommentThreads(await resolveToolSocialSetId(input.social_set_id), input.draft_id, input);
}
