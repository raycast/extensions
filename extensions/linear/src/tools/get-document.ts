import { resolveDocument } from "./linearUtils";
import { serializeDocument } from "./serializers";
import { withLinear } from "./withLinear";

type Input = { /** Document ID or slug */ id: string };

export default withLinear(async ({ id }: Input) => serializeDocument(await resolveDocument(id)));
