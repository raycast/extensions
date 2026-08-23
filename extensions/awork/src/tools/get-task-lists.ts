import { getTaskLists } from "../composables/FetchData";
import { requireAworkUuid } from "../composables/CreateTaskTool";
import { getTokens } from "../composables/WebClient";

type Input = {
  /** The UUID of the awork project whose task lists should be returned. Resolve project names with get-projects first. */
  projectId: string;
};

/** Get active task lists for an awork project. Requires project-planning-data read permission. */
export default async (input: Input) => {
  const projectId = requireAworkUuid(input.projectId, "projectId");

  const tokens = await getTokens({ allowUserInteraction: false });
  if (!tokens) {
    throw new Error("awork authentication required. Open an awork command in Raycast and sign in first.");
  }

  const taskLists = await getTaskLists(tokens.accessToken, projectId, { throwOnError: true });
  return taskLists.map((taskList) => ({ id: taskList.id, name: taskList.name }));
};
