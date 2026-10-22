import { client, collectFiltered, CursorPageInput, resolveTeam } from "./linearUtils";
import { mapPage, serializeCycle } from "./serializers";
import { withLinear } from "./withLinear";

interface Input extends CursorPageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  /** Team name, key, or ID. Omit to list cycles across all teams. */ team?: string;
  /** Only return the current, previous, or next cycle */ type?: "current" | "previous" | "next";
}

/** Lists cycles for one team, or across the workspace when no team is given. Each cycle carries its `teamId`, so unscoped results stay attributable. */
export default withLinear(async (input: Input) => {
  const team = input.team ? await resolveTeam(input.team) : undefined;
  const page = await collectFiltered(
    ({ first, after }) => (team ? team.cycles({ first, after }) : client().cycles({ first, after })),
    (cycle) =>
      !input.type ||
      (input.type === "current" && cycle.isActive) ||
      (input.type === "previous" && cycle.isPrevious) ||
      (input.type === "next" && cycle.isNext),
    input,
  );
  return mapPage(page, serializeCycle);
});
