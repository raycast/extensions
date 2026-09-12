import { Tool } from "@raycast/api";
import { updateDraft } from "../lib/api";
import { draftResult, resolveToolSocialSetId } from "../lib/tool-helpers";

type Input = {
  draft_id: number;
  social_set_id?: number;
  /** ISO 8601 date and time, or next-free-slot. */
  schedule_date: string;
};
export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Schedule draft #${input.draft_id} for ${input.schedule_date}?`,
});
export default async function tool(input: Input) {
  const socialSetId = await resolveToolSocialSetId(input.social_set_id);
  return draftResult(await updateDraft(socialSetId, input.draft_id, { publish_at: input.schedule_date }));
}
