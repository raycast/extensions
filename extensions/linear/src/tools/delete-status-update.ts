import { client } from "./linearUtils";
import { withLinear } from "./withLinear";

type Input = { type: "project" | "initiative"; id: string };

export default withLinear(async (input: Input) => {
  const result =
    input.type === "project"
      ? await client().archiveProjectUpdate(input.id)
      : await client().archiveInitiativeUpdate(input.id);
  return { success: result.success };
});
