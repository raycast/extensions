import { client } from "./linearUtils";
import { serializeAgentSkill } from "./serializers";
import { withLinear } from "./withLinear";

type Input = { /** Agent skill ID */ id: string };
export default withLinear(async ({ id }: Input) => serializeAgentSkill(await client().agentSkill(id)));
