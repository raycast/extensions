import { getSlackWebClient } from "./shared/client/WebClient";
import { readUserMention } from "./shared/client/userMentions";
import { withSlackClient } from "./shared/withSlackClient";

type Input = {
  /** The URI of a person selected from Slack's Users mention search. */
  uri: string;
};

async function readUser(input: Input) {
  return readUserMention(input.uri, (userId) => getSlackWebClient().users.info({ user: userId }));
}

export default withSlackClient(readUser);
