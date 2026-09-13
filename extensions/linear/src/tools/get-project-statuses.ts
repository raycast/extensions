import { resolveClient } from "../api/linearClient";

import { resolveToolClient, withToolAuth } from "./resolveToolWorkspace";

type Input = {
  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};

export default withToolAuth(async ({ workspaceId }: Input) => {
  const client = await resolveToolClient(workspaceId);
  const { linearClient } = resolveClient(client);

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
