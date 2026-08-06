import { getMediaStatus } from "../lib/api";
import { resolveToolSocialSetId } from "../lib/tool-helpers";
type Input = { media_id: string; social_set_id?: number };
export default async function tool(input: Input) {
  return getMediaStatus(await resolveToolSocialSetId(input.social_set_id), input.media_id);
}
