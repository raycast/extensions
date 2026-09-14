import { resolveReleaseNote } from "./linearUtils";
import { withToolAuth } from "./resolveToolWorkspace";
type Input = {
  id: string;
  includeReleases?: boolean;
  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};
export default withToolAuth(async ({ id, includeReleases }: Input) => {
  const note = await resolveReleaseNote(id);
  return {
    ...note,
    content: note.documentContent?.content,
    releases: includeReleases ? await note.releases : undefined,
  };
});
