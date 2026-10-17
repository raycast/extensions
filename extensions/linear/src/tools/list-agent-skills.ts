import { PaginationOrderBy } from "@linear/sdk";

import { client, collect, PageInput } from "./linearUtils";
import { mapPage, serializeAgentSkill } from "./serializers";
import { withLinear } from "./withLinear";

export default withLinear(async (input: PageInput) => {
  const page = await collect(
    ({ first, after }) =>
      client().agentSkills({
        first,
        after,
        orderBy: input.orderBy === "createdAt" ? PaginationOrderBy.CreatedAt : PaginationOrderBy.UpdatedAt,
      }),
    input,
  );
  return mapPage(page, serializeAgentSkill);
});
