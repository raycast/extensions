import { PaginationOrderBy } from "@linear/sdk";
import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { client, collectFiltered, PageInput } from "./linearUtils";

interface Input extends PageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  /** Sort: createdAt | updatedAt */ orderBy?: "createdAt" | "updatedAt";
  /** Search team name or key */ query?: string;
  /** Include archived teams */ includeArchived?: boolean;
}
export default withAccessToken(linear)(async (input: Input) => {
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
