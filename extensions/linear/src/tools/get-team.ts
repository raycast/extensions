import { resolveTeam } from "./linearUtils";
import { serializeTeam } from "./serializers";
import { withLinear } from "./withLinear";
type Input = { /** Team UUID, key, or name */ query: string };
export default withLinear(async ({ query }: Input) => serializeTeam(await resolveTeam(query)));
