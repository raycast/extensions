import { PaginationOrderBy } from "@linear/sdk";

import { client, collectFiltered, PageInput } from "./linearUtils";
import { withToolAuth } from "./resolveToolWorkspace";

interface Input extends PageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  /** Sort: createdAt | updatedAt */ orderBy?: "createdAt" | "updatedAt";
  /** Search team name or key */ query?: string;
  /** Include archived teams */ includeArchived?: boolean;
  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
}
export default withToolAuth(async (input: Input) => {
  const query = input.query?.toLowerCase();
  return collectFiltered(
    ({ first, after }) =>
      client().teams({
        first,
        after,
        includeArchived: input.includeArchived,
        orderBy: input.orderBy === "createdAt" ? PaginationOrderBy.CreatedAt : PaginationOrderBy.UpdatedAt,
      }),
    (team) => !query || `${team.name} ${team.key}`.toLowerCase().includes(query),
    input,
  );
});
