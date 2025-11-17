import { WorkflowState } from "@linear/sdk";
import { withAccessToken } from "@raycast/utils";

import { getLinearClient, linear } from "../api/linearClient";

export type StatusResult = Pick<WorkflowState, "id" | "name" | "description" | "position" | "type">;

export default withAccessToken(linear)(async ({
  teamId,
}: {
  /** The ID of the team to fetch the statuses for. Do not ask user to specify team if there is only one in the list */
  teamId: string;
}) => {
  const { linearClient } = getLinearClient();

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
});
