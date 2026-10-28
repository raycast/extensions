import { Icon } from "@raycast/api";

import { getLastUpdatedIssues, searchIssues } from "../api/getIssues";
import { toIssueMentions } from "../helpers/mentions";

import { withLinear } from "./withLinear";

type Input = {
  /** What the user typed in the Issues mention search, empty for recently updated issues. */
  query: string;
};

export default withLinear(async ({ query }: Input) => {
  const term = query.trim();
  const { issues } = term ? await searchIssues(term, undefined, 50) : await getLastUpdatedIssues();
  return toIssueMentions(issues ?? [], Icon.Document);
});
