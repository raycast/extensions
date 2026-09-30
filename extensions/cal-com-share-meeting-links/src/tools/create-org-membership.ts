import { Tool } from "@raycast/api";
import { calAPI } from "@api/cal.com";
import { assertId, confirmDestructive } from "@/lib/ai-tools";

type Input = {
  organizationId: number;
  userId: number;
  /** "OWNER" | "ADMIN" | "MEMBER". Default "MEMBER". */
  role?: "OWNER" | "ADMIN" | "MEMBER";
  accepted?: boolean;
};

export const confirmation: Tool.Confirmation<Input> = async (input) =>
  confirmDestructive({
    message: `Add user ${input.userId} to organization ${input.organizationId} as ${input.role ?? "MEMBER"}?`,
    image: "🏢",
  });

export default async function tool(input: Input): Promise<unknown> {
  const orgId = assertId(input.organizationId, "organizationId");
  return calAPI({
    method: "POST",
    url: `/organizations/${orgId}/memberships`,
    headers: { "cal-api-version": "2024-08-13" },
    data: {
      userId: input.userId,
      role: input.role ?? "MEMBER",
      ...(input.accepted !== undefined ? { accepted: input.accepted } : {}),
    },
  });
}
