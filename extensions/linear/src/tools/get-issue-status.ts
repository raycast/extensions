import { resolveWorkflowState } from "./issueUtils";
import { serializeWorkflowState } from "./serializers";
import { withLinear } from "./withLinear";

type Input = { id: string; name: string; team: string };

export default withLinear(async (input: Input) => {
  const status = await resolveWorkflowState(input.id, input.team);
  if (status.name.toLowerCase() !== input.name.toLowerCase()) {
    throw new Error(`Status ${input.id} is named "${status.name}", not "${input.name}".`);
  }
  return serializeWorkflowState(status);
});
