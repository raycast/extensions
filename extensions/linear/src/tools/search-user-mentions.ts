import { PaginationOrderBy } from "@linear/sdk";
import { Icon } from "@raycast/api";

import { getUserMentionFilter, toUserMentions } from "../helpers/mentions";

import { client } from "./linearUtils";
import { withLinear } from "./withLinear";

type Input = {
  /** What the user typed in the Users mention search, empty for the default list. */
  query: string;
};

export default withLinear(async ({ query }: Input) => {
  const users = await client().users({
    first: 50,
    orderBy: PaginationOrderBy.UpdatedAt,
    filter: getUserMentionFilter(query),
  });
  return toUserMentions(users.nodes, Icon.Person);
});
