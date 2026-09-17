import { PaginationOrderBy } from "@linear/sdk";
import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { client, collectFiltered, PageInput, resolveTeam } from "./linearUtils";

interface Input extends PageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  /** Sort: createdAt | updatedAt */ orderBy?: "createdAt" | "updatedAt";
  name?: string;
  team?: string;
}
export default withAccessToken(linear)(async (input: Input) => {
  const teamId = input.team ? (await resolveTeam(input.team)).id : undefined;
  const name = input.name?.toLowerCase();
  return collectFiltered(
    ({ first, after }) =>
      client().issueLabels({
        first,
        after,
        orderBy: input.orderBy === "createdAt" ? PaginationOrderBy.CreatedAt : PaginationOrderBy.UpdatedAt,
      }),
    (label) => (!name || label.name.toLowerCase().includes(name)) && (!teamId || label.teamId === teamId),
    input,
  );
});
