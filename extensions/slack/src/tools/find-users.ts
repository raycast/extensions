import { getSlackWebClient } from "../shared/client/WebClient";
import { withSlackClient } from "../shared/withSlackClient";

type Input = {
  /**
   * A name, display name, username, or email address to search for.
   */
  query: string;
};

async function findUsers(input: Input) {
  const query = input.query.trim().toLocaleLowerCase();
  if (!query) {
    throw new Error("Search query cannot be empty");
  }

  const slackWebClient = getSlackWebClient();
  const matches = [];
  let cursor: string | undefined;

  do {
    const response = await slackWebClient.users.list({ limit: 200, cursor });

    if (response.error) {
      throw new Error(response.error);
    }

    for (const user of response.members ?? []) {
      if (!user.id || user.deleted || user.is_bot || user.is_workflow_bot || user.id === "USLACKBOT") {
        continue;
      }

      const searchableValues = [
        user.name,
        user.real_name,
        user.profile?.display_name,
        user.profile?.real_name,
        user.profile?.email,
      ].filter((value): value is string => Boolean(value));

      if (searchableValues.some((value) => value.toLocaleLowerCase().includes(query))) {
        matches.push({
          id: user.id,
          username: user.name,
          displayName: user.profile?.display_name,
          realName: user.profile?.real_name ?? user.real_name,
          email: user.profile?.email,
          status: user.profile?.status_text,
          timezone: user.tz_label,
        });
      }
    }

    cursor = response.response_metadata?.next_cursor || undefined;
  } while (cursor);

  return matches;
}

export default withSlackClient(findUsers);
