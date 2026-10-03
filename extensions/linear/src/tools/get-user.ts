import { resolveUser } from "./linearUtils";
import { serializeUser } from "./serializers";
import { withLinear } from "./withLinear";
type Input = { /** User ID, name, email, or "me" */ query: string };
export default withLinear(async ({ query }: Input) => serializeUser(await resolveUser(query)));
