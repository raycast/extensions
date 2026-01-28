import { getTasks } from "../composables/FetchData";
import { getTokens } from "../composables/WebClient";

type Input = {
  /** The name or UUID of the awork task to search for, leave empty to get all tasks */
  taskName: string;
  /** The maximum number of awork tasks to fetch */
  resultSize?: number;
  /** The UUID of the awork project to search in */
  projectId?: string;
};

export default async (input: Input) => {
  const tokens = await getTokens();
  if (!tokens) {
    return undefined;
  }

  return getTasks(
    tokens.accessToken,
    input.taskName,
    input.resultSize ? input.resultSize : 100,
    input.projectId,
  )({ page: 0 });
};
