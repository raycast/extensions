import { SlackClient } from "../shared/client/SlackClient";
import { toUserMentions } from "../shared/client/userMentions";
import { withSlackClient } from "../shared/withSlackClient";

type Input = {
  /** What the user typed in the Users mention search, empty for the default list. */
  query: string;
};

async function searchUserMentions(input: Input) {
  return toUserMentions(await SlackClient.searchUsers(input.query));
}

export default withSlackClient(searchUserMentions);
