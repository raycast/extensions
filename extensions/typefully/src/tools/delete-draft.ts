import { Tool } from "@raycast/api";
import { deleteDraft } from "../lib/api";
import { resolveToolSocialSetId } from "../lib/tool-helpers";

type Input = { draft_id: number; social_set_id?: number };
export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Delete Typefully draft #${input.draft_id}?`,
});
export default async function tool(input: Input) {
  const socialSetId = await resolveToolSocialSetId(input.social_set_id);
  await deleteDraft(socialSetId, input.draft_id);
  return { success: true, draft_id: input.draft_id, social_set_id: socialSetId };
}
