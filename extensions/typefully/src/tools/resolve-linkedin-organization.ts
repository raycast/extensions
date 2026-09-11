import { resolveLinkedInOrganization } from "../lib/api";
import { resolveToolSocialSetId } from "../lib/tool-helpers";
type Input = { organization_url: string; social_set_id?: number };
export default async function tool(input: Input) {
  return resolveLinkedInOrganization(await resolveToolSocialSetId(input.social_set_id), input.organization_url);
}
