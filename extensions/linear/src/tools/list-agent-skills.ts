import { PaginationOrderBy } from "@linear/sdk";

import { client, collect, PageInput } from "./linearUtils";
import { withToolAuth } from "./resolveToolWorkspace";

interface Input extends PageInput {
  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
}

export default withToolAuth(async (input: Input) => {
  return collect(
    ({ first, after }) =>
      client().agentSkills({
        first,
        after,
        orderBy: input.orderBy === "createdAt" ? PaginationOrderBy.CreatedAt : PaginationOrderBy.UpdatedAt,
      }),
    input,
  );
});
