import { withAccessToken } from "@raycast/utils";

import { searchIssues } from "../api/getIssues";
import { linear } from "../api/linearClient";

import { collect, CursorPageInput } from "./linearUtils";

interface Input extends CursorPageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  /** The query to search for. Only use plain text: it doesn't support any operators */
  query: string;
}

export default withAccessToken(linear)(async (input: Input) => {
  return collect(async ({ first, after }) => {
    const result = await searchIssues(input.query, after, first);
    return {
      nodes: result.issues ?? [],
      pageInfo: result.pageInfo ?? { hasNextPage: false },
    };
  }, input);
});
