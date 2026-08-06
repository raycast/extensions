import { getSocialSetDetail } from "../lib/api";
import { resolveToolSocialSetId } from "../lib/tool-helpers";

type Input = { social_set_id?: number };
export default async function tool(input: Input) {
  return getSocialSetDetail(await resolveToolSocialSetId(input.social_set_id));
}
