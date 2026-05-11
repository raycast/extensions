import { getSlackWebClient } from "../shared/client/WebClient";
import { withSlackClient } from "../shared/withSlackClient";

async function getUsers() {
  const slackWebClient = getSlackWebClient();
  const users = await slackWebClient.users.list({
    limit: 1000,
  });

  if (users.error) {
    throw new Error(users.error);
  }

  return users.members?.map((u) => ({
    id: u.id,
    name: u.name,
    realName: u.real_name,
    status: u.profile?.status_text,
    timezone: u.tz_label,
  }));
}

export default withSlackClient(getUsers);
