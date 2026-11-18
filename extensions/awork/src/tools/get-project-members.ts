import { getProjectMembers } from "../composables/FetchData";
import { requireAworkUuid } from "../composables/CreateTaskTool";
import { getTokens } from "../composables/WebClient";

type Input = {
  /** The UUID of the awork project whose assignable members should be returned. Resolve project names with get-projects first. */
  projectId: string;
};

const getMemberName = (firstName?: string | null, lastName?: string | null) =>
  [firstName, lastName]
    .map((namePart) => namePart?.trim())
    .filter((namePart): namePart is string => Boolean(namePart))
    .join(" ") || "Unnamed User";

/** Get project members for task assignment. Requires project ownership or project-master-data read permission. */
export default async (input: Input) => {
  const projectId = requireAworkUuid(input.projectId, "projectId");

  const tokens = await getTokens({ allowUserInteraction: false });
  if (!tokens) {
    throw new Error("awork authentication required. Open an awork command in Raycast and sign in first.");
  }

  const members = await getProjectMembers(tokens.accessToken, projectId, { throwOnError: true });
  return members.map((member) => ({
    userId: member.userId,
    name: getMemberName(member.firstName, member.lastName),
    isExternal: member.isExternal,
  }));
};
