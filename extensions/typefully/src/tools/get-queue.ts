import { getQueue } from "../lib/api";
import { resolveToolSocialSetId } from "../lib/tool-helpers";
type Input = { start_date: string; end_date: string; social_set_id?: number };
export default async function tool(input: Input) {
  return getQueue(await resolveToolSocialSetId(input.social_set_id), input.start_date, input.end_date);
}
