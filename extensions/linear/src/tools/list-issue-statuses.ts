import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { collect, CursorPageInput, resolveTeam } from "./linearUtils";

interface Input extends CursorPageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  team: string;
}

export default withAccessToken(linear)(async (input: Input) => {
  const team = await resolveTeam(input.team);
  return collect(({ first, after }) => team.states({ first, after }), input);
});
