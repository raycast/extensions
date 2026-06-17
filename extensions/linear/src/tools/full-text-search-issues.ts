import { withAccessToken } from "@raycast/utils";

import { searchIssues } from "../api/getIssues";
import { linear } from "../api/linearClient";

export default withAccessToken(linear)(async (inputs: {
  /** The query to search for. Only use plain text: it doesn't support any operators */
  query: string;
}) => {
  return (await searchIssues(inputs.query)).issues;
});
