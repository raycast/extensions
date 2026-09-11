import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { resolveMilestone } from "./linearUtils";
type Input = { project: string; query: string };
export default withAccessToken(linear)(async ({ project, query }: Input) => resolveMilestone(project, query));
