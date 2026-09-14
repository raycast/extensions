import { client, collectFiltered, CursorPageInput } from "./linearUtils";
import { withToolAuth } from "./resolveToolWorkspace";

interface Input extends CursorPageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  /** Team ID */ teamId: string;
  /** Filter the team's cycles */ type?: "current" | "previous" | "next";
  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
}

export default withToolAuth(async (input: Input) => {
  const team = await client().team(input.teamId);
  return collectFiltered(
    ({ first, after }) => team.cycles({ first, after }),
    (cycle) =>
      !input.type ||
      (input.type === "current" && cycle.isActive) ||
      (input.type === "previous" && cycle.isPrevious) ||
      (input.type === "next" && cycle.isNext),
    input,
  );
});
