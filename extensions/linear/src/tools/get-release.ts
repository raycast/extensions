import { resolveRelease } from "./linearUtils";
import { withToolAuth } from "./resolveToolWorkspace";
type Input = {
  id: string;
  includeReleaseNotes?: boolean;
  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};
export default withToolAuth(async ({ id, includeReleaseNotes }: Input) => {
  const release = await resolveRelease(id);
  return { ...release, releaseNotes: includeReleaseNotes ? release.releaseNotes : undefined };
});
