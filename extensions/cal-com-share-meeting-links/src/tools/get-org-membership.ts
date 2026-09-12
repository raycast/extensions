import { calAPI } from "@api/cal.com";
import { assertId } from "@/lib/ai-tools";

type Input = {
  organizationId: number;
  membershipId: number;
};

export default async function tool(input: Input): Promise<unknown> {
  const orgId = assertId(input.organizationId, "organizationId");
  const membershipId = assertId(input.membershipId, "membershipId");
  return calAPI({
    url: `/organizations/${orgId}/memberships/${membershipId}`,
    headers: { "cal-api-version": "2024-08-13" },
  });
}
