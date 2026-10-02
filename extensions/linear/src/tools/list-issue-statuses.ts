import { collect, CursorPageInput, resolveTeam } from "./linearUtils";
import { mapPage, serializeWorkflowState } from "./serializers";
import { withLinear } from "./withLinear";

interface Input extends CursorPageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  team: string;
}

export default withLinear(async (input: Input) => {
  const team = await resolveTeam(input.team);
  const page = await collect(({ first, after }) => team.states({ first, after }), input);
  return mapPage(page, serializeWorkflowState);
});
