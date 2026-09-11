import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { client } from "./linearUtils";

type Input = { /** Agent skill ID */ id: string };
export default withAccessToken(linear)(async ({ id }: Input) => client().agentSkill(id));
