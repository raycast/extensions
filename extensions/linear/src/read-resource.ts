import { readMentionResource } from "./helpers/mentions";
import { client } from "./tools/linearUtils";
import { serializeIssue, serializeUser } from "./tools/serializers";
import { withLinear } from "./tools/withLinear";

type Input = {
  /** The URI of a user or issue selected from Linear's mention searches. */
  uri: string;
};

export default withLinear(async ({ uri }: Input) =>
  readMentionResource(uri, {
    users: async (id) => serializeUser(await client().user(id)),
    issues: async (id) => serializeIssue(await client().issue(id)),
  }),
);
