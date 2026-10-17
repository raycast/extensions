import { calAPI } from "@api/cal.com";
import { assertId } from "@/lib/ai-tools";

type Input = {
  organizationId: number;
  routingFormId: string;
  /** Page size. */
  take?: number;
  /** Skip count. */
  skip?: number;
};

export default async function tool(input: Input): Promise<unknown> {
  const orgId = assertId(input.organizationId, "organizationId");
  const formId = assertId(input.routingFormId, "routingFormId");
  const params: Record<string, unknown> = {};
  if (input.take !== undefined) params.take = input.take;
  if (input.skip !== undefined) params.skip = input.skip;
  return calAPI({
    url: `/organizations/${orgId}/routing-forms/${formId}/responses`,
    headers: { "cal-api-version": "2024-08-13" },
    params,
  });
}
