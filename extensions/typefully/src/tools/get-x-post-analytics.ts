import { getXPostAnalytics } from "../lib/api";
import { resolveToolSocialSetId } from "../lib/tool-helpers";
type Input = {
  social_set_id?: number;
  start_date: string;
  end_date: string;
  include_replies?: boolean;
  limit?: number;
  offset?: number;
};
export default async function tool(input: Input) {
  return getXPostAnalytics(await resolveToolSocialSetId(input.social_set_id), {
    startDate: input.start_date,
    endDate: input.end_date,
    includeReplies: input.include_replies,
    limit: input.limit,
    offset: input.offset,
  });
}
