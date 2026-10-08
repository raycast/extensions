import { Tool } from "@raycast/api";
import { updateQueueSchedule } from "../lib/api";
import { resolveToolSocialSetId } from "../lib/tool-helpers";
type Input = { social_set_id?: number; rules: Array<{ h: number; m: number; days: string[] }> };
export const confirmation: Tool.Confirmation<Input> = async () => ({
  message: "Replace the Typefully queue schedule with these rules?",
});
export default async function tool(input: Input) {
  return updateQueueSchedule(await resolveToolSocialSetId(input.social_set_id), input.rules);
}
