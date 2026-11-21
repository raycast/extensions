import { PaginationOrderBy } from "@linear/sdk";

import { client, collectFiltered, PageInput } from "./linearUtils";
import { mapPage, serializeLabel } from "./serializers";
import { withLinear } from "./withLinear";

interface Input extends PageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  /** Sort: createdAt | updatedAt */ orderBy?: "createdAt" | "updatedAt";
  name?: string;
}
export default withLinear(async (input: Input) => {
  const name = input.name?.toLowerCase();
  const page = await collectFiltered(
    ({ first, after }) =>
      client().projectLabels({
        first,
        after,
        orderBy: input.orderBy === "createdAt" ? PaginationOrderBy.CreatedAt : PaginationOrderBy.UpdatedAt,
      }),
    (label) => !name || label.name.toLowerCase().includes(name),
    input,
  );
  return mapPage(page, serializeLabel);
});
