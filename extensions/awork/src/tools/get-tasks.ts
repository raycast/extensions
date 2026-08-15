import { getTasks } from "../composables/FetchData";
import { getTokens } from "../composables/WebClient";

type Input = {
  /** The name or UUID of the awork task to search for, leave empty to get all tasks */
  taskName?: string;
  /** The maximum number of awork tasks to fetch */
  resultSize?: number;
  /** The UUID of the awork project to search in */
  projectId?: string;
};

export default async (input: Input) => {
  const tokens = await getTokens({ allowUserInteraction: false });
  if (!tokens) {
    throw new Error("awork authentication required. Open an awork command in Raycast and sign in first.");
  }

  const resultSize = Math.min(Math.max(input.resultSize ?? 100, 1), 500);
  return getTasks(tokens.accessToken, input.taskName?.trim() ?? "", resultSize, input.projectId)({ page: 0 });
};
