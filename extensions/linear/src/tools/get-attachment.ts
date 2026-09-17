import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { client } from "./linearUtils";

type Input = { id: string };
export default withAccessToken(linear)(async ({ id }: Input) => client().attachment(id));
