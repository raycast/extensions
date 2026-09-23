import { getXFollowerAnalytics } from "../lib/api";
import { resolveToolSocialSetId } from "../lib/tool-helpers";
type Input = { social_set_id?: number; start_date?: string; end_date?: string };
export default async function tool(input: Input) {
  return getXFollowerAnalytics(await resolveToolSocialSetId(input.social_set_id), input.start_date, input.end_date);
}
