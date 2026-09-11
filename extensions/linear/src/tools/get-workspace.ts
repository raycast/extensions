import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { client } from "./linearUtils";
export default withAccessToken(linear)(async () => client().organization);
