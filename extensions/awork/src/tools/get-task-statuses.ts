import { getPrivateTaskStatuses, getTaskStatuses } from "../composables/FetchData";
import { requireAworkUuid } from "../composables/CreateTaskTool";
import { getTokens } from "../composables/WebClient";

type Input = {
  /** The awork project UUID. Resolve project names with get-projects. Omit only when isPrivate is true. */
  projectId?: string;
  /** Set to true to get statuses for private tasks instead of a project. */
  isPrivate?: boolean;
};

/** Get the statuses that can be assigned to project tasks or private tasks. */
export default async (input: Input) => {
  if (input.isPrivate && input.projectId) throw new Error("A private task does not have a projectId");
  if (!input.isPrivate && !input.projectId) throw new Error("projectId is required unless isPrivate=true");
  const projectId = input.projectId ? requireAworkUuid(input.projectId, "projectId") : undefined;

  const tokens = await getTokens({ allowUserInteraction: false });
  if (!tokens) {
    throw new Error("awork authentication required. Open an awork command in Raycast and sign in first.");
  }

  const statuses = input.isPrivate
    ? await getPrivateTaskStatuses(tokens.accessToken, { throwOnError: true })
    : await getTaskStatuses(tokens.accessToken, projectId as string, { throwOnError: true });
  return statuses.map(({ id, name, type }) => ({ id, name, type }));
};
