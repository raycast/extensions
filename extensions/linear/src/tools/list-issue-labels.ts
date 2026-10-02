import { PaginationOrderBy } from "@linear/sdk";

import { client, collectFiltered, PageInput, resolveTeam } from "./linearUtils";
import { mapPage, serializeLabel } from "./serializers";
import { withLinear } from "./withLinear";

interface Input extends PageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  /** Sort: createdAt | updatedAt */ orderBy?: "createdAt" | "updatedAt";
  name?: string;
  team?: string;
}
export default withLinear(async (input: Input) => {
  const teamId = input.team ? (await resolveTeam(input.team)).id : undefined;
  const name = input.name?.toLowerCase();
  const page = await collectFiltered(
    ({ first, after }) =>
      client().issueLabels({
        first,
        after,
        orderBy: input.orderBy === "createdAt" ? PaginationOrderBy.CreatedAt : PaginationOrderBy.UpdatedAt,
      }),
    (label) => (!name || label.name.toLowerCase().includes(name)) && (!teamId || label.teamId === teamId),
    input,
  );
  return mapPage(page, serializeLabel);
});
