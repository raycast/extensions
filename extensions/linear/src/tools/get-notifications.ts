import { getNotifications } from "../api/getNotifications";

import { resolveToolClient, withToolAuth } from "./resolveToolWorkspace";

type Input = {
  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};

export default withToolAuth(async ({ workspaceId }: Input) => {
  const client = await resolveToolClient(workspaceId);
  const { notifications } = await getNotifications(client);

  return notifications;
});
