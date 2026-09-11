import { Tool } from "@raycast/api";
import { calAPI } from "@api/cal.com";
import { assertId, confirmDestructive } from "@/lib/ai-tools";

type Input = {
  organizationId: number;
  membershipId: number;
};

export const confirmation: Tool.Confirmation<Input> = async (input) =>
  confirmDestructive({
    message: `Remove membership ${input.membershipId} from organization ${input.organizationId}? The user will lose access immediately.`,
    image: "🗑️",
  });

export default async function tool(input: Input): Promise<unknown> {
  const orgId = assertId(input.organizationId, "organizationId");
  const membershipId = assertId(input.membershipId, "membershipId");
  return calAPI({
    method: "DELETE",
    url: `/organizations/${orgId}/memberships/${membershipId}`,
    headers: { "cal-api-version": "2024-08-13" },
  });
}
