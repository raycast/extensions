import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { resolveDocument } from "./linearUtils";

type Input = { /** Document ID or slug */ id: string };

export default withAccessToken(linear)(async ({ id }: Input) => resolveDocument(id));
