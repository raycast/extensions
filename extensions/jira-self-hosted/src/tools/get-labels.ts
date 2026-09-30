import { getLabels } from "../api/labels";
import { withJiraCredentials } from "../helpers/withJiraCredentials";

export default withJiraCredentials(async function () {
  return getLabels();
});
