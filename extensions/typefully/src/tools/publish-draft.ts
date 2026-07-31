import { Tool } from "@raycast/api";
import { updateDraft } from "../lib/api";
import { draftResult, resolveToolSocialSetId } from "../lib/tool-helpers";

type Input = { draft_id: number; social_set_id?: number };
export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Publish Typefully draft #${input.draft_id} now? This is public and cannot be undone.`,
});
export default async function tool(input: Input) {
  const socialSetId = await resolveToolSocialSetId(input.social_set_id);
  return draftResult(await updateDraft(socialSetId, input.draft_id, { publish_at: "now" }));
}
