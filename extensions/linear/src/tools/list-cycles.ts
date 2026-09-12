import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { client, collectFiltered, CursorPageInput } from "./linearUtils";

interface Input extends CursorPageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  /** Team ID */ teamId: string;
  /** Filter the team's cycles */ type?: "current" | "previous" | "next";
}

export default withAccessToken(linear)(async (input: Input) => {
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
