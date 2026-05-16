import { getOrganization } from "../api/organizations";
import { getActiveOrgId } from "./_shared";

export default async function () {
  const orgId = await getActiveOrgId();
  return await getOrganization(orgId);
}
