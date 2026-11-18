import { client } from "./linearUtils";
import { withLinear } from "./withLinear";

type Input = { id: string };
export default withLinear(async ({ id }: Input) => {
  const result = await client().deleteAttachment(id);
  return { success: result.success };
});
