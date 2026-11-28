import { PaginationOrderBy } from "@linear/sdk";

import { client, collectFiltered, PageInput, resolveTeam } from "./linearUtils";
import { mapPage, serializeUser } from "./serializers";
import { withLinear } from "./withLinear";

interface Input extends PageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  /** Sort: createdAt | updatedAt */ orderBy?: "createdAt" | "updatedAt";
  /** Filter by name or email */ query?: string;
  /** Team name or ID */ team?: string;
}
export default withLinear(async (input: Input) => {
  const team = input.team ? await resolveTeam(input.team) : undefined;
  const query = input.query?.toLowerCase();
  const page = await collectFiltered(
    ({ first, after }) =>
      team
        ? team.members({ first, after })
        : client().users({
            first,
            after,
            orderBy: input.orderBy === "createdAt" ? PaginationOrderBy.CreatedAt : PaginationOrderBy.UpdatedAt,
          }),
    (user) => !query || `${user.name} ${user.displayName} ${user.email}`.toLowerCase().includes(query),
    input,
  );
  return mapPage(page, serializeUser);
});
