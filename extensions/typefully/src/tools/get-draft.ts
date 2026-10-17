import { getDraft } from "../lib/api";
import { resolveToolSocialSetId } from "../lib/tool-helpers";

type Input = {
  /** Draft ID. For a Typefully URL, d is the draft ID. */
  draft_id: number;
  /** Social set ID. For a Typefully URL, a is the social set ID. */
  social_set_id?: number;
  /** Remove comment anchors for display only. Never enable before editing the returned content. */
  exclude_comment_markers?: boolean;
};

export default async function tool(input: Input) {
  const socialSetId = await resolveToolSocialSetId(input.social_set_id);
  return getDraft(socialSetId, input.draft_id, input.exclude_comment_markers);
}
