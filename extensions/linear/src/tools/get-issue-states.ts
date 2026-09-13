import { WorkflowState } from "@linear/sdk";

import { resolveClient } from "../api/linearClient";

import { resolveToolClient, withToolAuth } from "./resolveToolWorkspace";

export type StatusResult = Pick<WorkflowState, "id" | "name" | "description" | "position" | "type">;

export default withToolAuth(
  async ({
    teamId,
    workspaceId,
  }: {
    /** The ID of the team to fetch the statuses for. Do not ask user to specify team if there is only one in the list */
    teamId: string;

    /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
    workspaceId?: string;
  }) => {
    const client = await resolveToolClient(workspaceId);
    const { linearClient } = resolveClient(client);

    const allStates: StatusResult[] = [];
    let hasNextPage = true;
    let endCursor = null;

    while (hasNextPage) {
      const states = await linearClient.workflowStates({
        filter: { team: { id: { eq: teamId } } },
        after: endCursor,
        first: 100,
      });
      allStates.push(
        ...states.nodes.map((state) => ({
          id: state.id,
          name: state.name,
          description: state.description,
          position: state.position,
          type: state.type,
        })),
      );
      hasNextPage = states.pageInfo.hasNextPage;
      endCursor = states.pageInfo.endCursor;
    }

    return allStates;
  },
);
