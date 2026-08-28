import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { resolveTeam } from "./linearUtils";
type Input = { /** Team UUID, key, or name */ query: string };
export default withAccessToken(linear)(async ({ query }: Input) => resolveTeam(query));
