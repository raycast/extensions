import { calAPI } from "@api/cal.com";
import { assertId } from "@/lib/ai-tools";

type Input = {
  /** Organization id. Look up via get_me (organization.id) if unknown. */
  organizationId: number;
};

export default async function tool(input: Input): Promise<unknown> {
  const id = assertId(input.organizationId, "organizationId");
  return calAPI({
    url: `/organizations/${id}/memberships`,
    headers: { "cal-api-version": "2024-08-13" },
  });
}
