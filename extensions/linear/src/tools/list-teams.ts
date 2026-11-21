import { PaginationOrderBy } from "@linear/sdk";

import { client, collectFiltered, PageInput } from "./linearUtils";
import { mapPage, serializeTeam } from "./serializers";
import { withLinear } from "./withLinear";

interface Input extends PageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  /** Sort: createdAt | updatedAt */ orderBy?: "createdAt" | "updatedAt";
  /** Search team name or key */ query?: string;
  /** Include archived teams */ includeArchived?: boolean;
}
export default withLinear(async (input: Input) => {
  const query = input.query?.toLowerCase();
  const page = await collectFiltered(
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
  return mapPage(page, serializeTeam);
});
