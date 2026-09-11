import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { resolveRelease } from "./linearUtils";
type Input = { id: string; includeReleaseNotes?: boolean };
export default withAccessToken(linear)(async ({ id, includeReleaseNotes }: Input) => {
  const release = await resolveRelease(id);
  return { ...release, releaseNotes: includeReleaseNotes ? release.releaseNotes : undefined };
});
