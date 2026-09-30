import { getUsers } from "../api/users";
import { withJiraCredentials } from "../helpers/withJiraCredentials";

export default withJiraCredentials(async function () {
  return getUsers();
});
