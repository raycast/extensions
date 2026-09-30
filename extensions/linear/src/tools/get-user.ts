import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { resolveUser } from "./linearUtils";
type Input = { /** User ID, name, email, or "me" */ query: string };
export default withAccessToken(linear)(async ({ query }: Input) => resolveUser(query));
