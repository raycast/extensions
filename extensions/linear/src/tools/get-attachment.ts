import { client } from "./linearUtils";
import { serializeAttachment } from "./serializers";
import { withLinear } from "./withLinear";

type Input = { id: string };
export default withLinear(async ({ id }: Input) => serializeAttachment(await client().attachment(id)));
