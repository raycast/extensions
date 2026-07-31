import { Tool } from "@raycast/api";
import { createTag } from "../lib/api";
import { resolveToolSocialSetId } from "../lib/tool-helpers";
type Input = { name: string; social_set_id?: number };
export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Create Typefully tag “${input.name}”?`,
});
export default async function tool(input: Input) {
  return createTag(await resolveToolSocialSetId(input.social_set_id), input.name);
}
