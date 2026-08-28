import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { resolveWorkflowState } from "./issueUtils";

type Input = { id: string; name: string; team: string };

export default withAccessToken(linear)(async (input: Input) => {
  const status = await resolveWorkflowState(input.id, input.team);
  if (status.name.toLowerCase() !== input.name.toLowerCase()) {
    throw new Error(`Status ${input.id} is named "${status.name}", not "${input.name}".`);
  }
  return status;
});
