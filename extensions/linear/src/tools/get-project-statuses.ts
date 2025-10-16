import { withAccessToken } from "@raycast/utils";

import { getLinearClient, linear } from "../api/linearClient";

export default withAccessToken(linear)(async () => {
  const { linearClient } = getLinearClient();

  const statuses = [];
  const projectStatuses = await linearClient.projectStatuses();
  for (const status of projectStatuses.nodes) {
    statuses.push({
      id: status.id,
      name: status.name,
      type: status.type,
      indefinite: status.indefinite,
      color: status.color,
    });
  }
  return statuses;
});
