import { searchIssues } from "../api/getIssues";

import { collect, CursorPageInput } from "./linearUtils";
import { resolveToolClient, withToolAuth } from "./resolveToolWorkspace";

interface Input extends CursorPageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  /** The query to search for. Only use plain text: it doesn't support any operators */
  query: string;
  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
}

export default withToolAuth(async (input: Input) => {
  const client = await resolveToolClient(input.workspaceId);
  return collect(async ({ first, after }) => {
    const result = await searchIssues(input.query, after, first, client);
    return {
      nodes: result.issues ?? [],
      pageInfo: result.pageInfo ?? { hasNextPage: false },
    };
  }, input);
});
