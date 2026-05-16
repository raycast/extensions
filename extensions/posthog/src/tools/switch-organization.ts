import { Tool } from "@raycast/api";

import { getOrganization, listOrganizations } from "../api/organizations";
import { setActiveOrgId } from "./_shared";

type Input = {
  /** The organization ID to switch to. Get this from `organizations-get`. */
  orgId: string;
};

export default async function (input: Input) {
  // Verify the org exists before persisting.
  await getOrganization(input.orgId);
  await setActiveOrgId(input.orgId);
  return { activeOrgId: input.orgId };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const orgs = await listOrganizations();
  const match = orgs.results.find((o) => o.id === input.orgId);
  return {
    message: `Switch active organization to "${match?.name ?? input.orgId}"?`,
    info: [{ name: "Organization", value: match?.name ?? input.orgId }],
  };
};
