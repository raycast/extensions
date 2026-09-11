import { PaginationOrderBy } from "@linear/sdk";
import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { client, collect, PageInput } from "./linearUtils";

export default withAccessToken(linear)(async (input: PageInput) => {
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
