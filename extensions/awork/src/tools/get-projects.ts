import { getProjects } from "../composables/FetchData";
import { getTokens } from "../composables/WebClient";

type Input = {
  /** The name of the awork project to search for, leave empty to get all projects */
  projectName?: string;
  /** The maximum number of awork projects to fetch */
  resultSize?: number;
};

export default async (input: Input) => {
  const tokens = await getTokens({ allowUserInteraction: false });
  if (!tokens) {
    throw new Error("awork authentication required. Open an awork command in Raycast and sign in first.");
  }

  const resultSize = Math.min(Math.max(input.resultSize ?? 100, 1), 500);
  return getProjects(tokens.accessToken, input.projectName?.trim() ?? "", resultSize)({ page: 0 });
};
