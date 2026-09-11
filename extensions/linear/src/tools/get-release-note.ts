import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { resolveReleaseNote } from "./linearUtils";
type Input = { id: string; includeReleases?: boolean };
export default withAccessToken(linear)(async ({ id, includeReleases }: Input) => {
  const note = await resolveReleaseNote(id);
  return {
    ...note,
    content: note.documentContent?.content,
    releases: includeReleases ? await note.releases : undefined,
  };
});
