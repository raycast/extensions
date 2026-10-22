import { resolveReleaseNote } from "./linearUtils";
import { serializeRelease, serializeReleaseNote } from "./serializers";
import { withLinear } from "./withLinear";
type Input = { id: string; includeReleases?: boolean };
export default withLinear(async ({ id, includeReleases }: Input) => {
  const note = await resolveReleaseNote(id);
  return {
    ...serializeReleaseNote(note, { content: true }),
    releases: includeReleases ? (await note.releases).map((release) => serializeRelease(release)) : undefined,
  };
});
