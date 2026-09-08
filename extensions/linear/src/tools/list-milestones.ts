import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { collect, CursorPageInput, resolveProject } from "./linearUtils";

interface Input extends CursorPageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  project: string;
}

export default withAccessToken(linear)(async (input: Input) => {
  const project = await resolveProject(input.project);
  return collect(({ first, after }) => project.projectMilestones({ first, after }), input);
});
