import { calAPI } from "@api/cal.com";
import { assertId } from "@/lib/ai-tools";

type Input = { organizationId: number };

export default async function tool(input: Input): Promise<unknown> {
  const orgId = assertId(input.organizationId, "organizationId");
  return calAPI({
    url: `/organizations/${orgId}/routing-forms`,
    headers: { "cal-api-version": "2024-08-13" },
  });
}
