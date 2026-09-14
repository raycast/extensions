import { PaginationOrderBy } from "@linear/sdk";

import { client, collectFiltered, PageInput } from "./linearUtils";
import { withToolAuth } from "./resolveToolWorkspace";

interface Input extends PageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  /** Sort: createdAt | updatedAt */ orderBy?: "createdAt" | "updatedAt";
  name?: string;
  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
}
export default withToolAuth(async (input: Input) => {
  const name = input.name?.toLowerCase();
  return collectFiltered(
    ({ first, after }) =>
      client().initiativeLabels({
        first,
        after,
        orderBy: input.orderBy === "createdAt" ? PaginationOrderBy.CreatedAt : PaginationOrderBy.UpdatedAt,
      }),
    (label) => !name || label.name.toLowerCase().includes(name),
    input,
  );
});
