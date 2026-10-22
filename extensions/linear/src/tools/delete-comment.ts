import { client } from "./linearUtils";
import { withLinear } from "./withLinear";
type Input = { /** Comment ID */ id: string };
export default withLinear(async ({ id }: Input) => {
  const result = await client().deleteComment(id);
  return { success: result.success, entityId: result.entityId };
});
