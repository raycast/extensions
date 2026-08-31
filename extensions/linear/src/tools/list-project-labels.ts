import { PaginationOrderBy } from "@linear/sdk";
import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { client, collectFiltered, PageInput } from "./linearUtils";

interface Input extends PageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  /** Sort: createdAt | updatedAt */ orderBy?: "createdAt" | "updatedAt";
  name?: string;
}
export default withAccessToken(linear)(async (input: Input) => {
  const name = input.name?.toLowerCase();
  return collectFiltered(
    ({ first, after }) =>
      client().projectLabels({
        first,
        after,
        orderBy: input.orderBy === "createdAt" ? PaginationOrderBy.CreatedAt : PaginationOrderBy.UpdatedAt,
      }),
    (label) => !name || label.name.toLowerCase().includes(name),
    input,
  );
});
