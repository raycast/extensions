import { getTeams } from "../api/teams";
import { withJiraCredentials } from "../helpers/withJiraCredentials";

export default withJiraCredentials(async function () {
  return getTeams();
});
