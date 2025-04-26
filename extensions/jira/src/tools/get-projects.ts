import { getProjects } from "../api/projects";
import { withJiraCredentials } from "../helpers/withJiraCredentials";

export default withJiraCredentials(async function () {
  return getProjects();
});
