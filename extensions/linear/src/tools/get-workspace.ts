import { client } from "./linearUtils";
import { serializeOrganization } from "./serializers";
import { withLinear } from "./withLinear";
export default withLinear(async () => serializeOrganization(await client().organization));
