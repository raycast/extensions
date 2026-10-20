import { client, collect, CursorPageInput, resolveTeam } from "./linearUtils";
import { mapPage, serializeWorkflowState } from "./serializers";
import { withLinear } from "./withLinear";

interface Input extends CursorPageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  /** Team name, key, or ID. Omit to list statuses of all teams; each status carries its `teamId`. */ team?: string;
}

/** Lists issue workflow statuses. Statuses belong to a team, so pass `team` before using a status ID in a write for that team. */
export default withLinear(async (input: Input) => {
  const team = input.team ? await resolveTeam(input.team) : undefined;
  const page = await collect(
    ({ first, after }) => (team ? team.states({ first, after }) : client().workflowStates({ first, after })),
    input,
  );
  return mapPage(page, serializeWorkflowState);
});
