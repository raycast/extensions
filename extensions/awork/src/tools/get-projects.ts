import { getProjects } from "../composables/FetchData";
import { getTokens } from "../composables/WebClient";

type Input = {
  /** The name of the awork project to search for, leave empty to get all projects */
  projectName: string;
  /** The maximum number of awork projects to fetch */
  resultSize?: number;
};

export default async (input: Input) => {
  const tokens = await getTokens();
  if (!tokens) {
    return undefined;
  }
  return getProjects(tokens.accessToken, input.projectName, input.resultSize ?? 100)({ page: 0 });
};
