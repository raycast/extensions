import { resolveRelease } from "./linearUtils";
import { serializeRelease } from "./serializers";
import { withLinear } from "./withLinear";
type Input = { id: string; includeReleaseNotes?: boolean };
export default withLinear(async ({ id, includeReleaseNotes }: Input) => {
  const release = await resolveRelease(id);
  return serializeRelease(release, { releaseNotes: includeReleaseNotes });
});
