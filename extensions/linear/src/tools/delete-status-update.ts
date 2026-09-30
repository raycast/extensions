import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { client } from "./linearUtils";

type Input = { type: "project" | "initiative"; id: string };

export default withAccessToken(linear)(async (input: Input) => {
  const result =
    input.type === "project"
      ? await client().archiveProjectUpdate(input.id)
      : await client().archiveInitiativeUpdate(input.id);
  return { success: result.success };
});
