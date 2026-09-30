import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { client } from "./linearUtils";
type Input = { /** Comment ID */ id: string };
export default withAccessToken(linear)(async ({ id }: Input) => client().deleteComment(id));
