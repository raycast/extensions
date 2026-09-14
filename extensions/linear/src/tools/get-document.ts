import { resolveDocument } from "./linearUtils";
import { withToolAuth } from "./resolveToolWorkspace";

type Input = {
  /** Document ID or slug */ id: string;
  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};

export default withToolAuth(async ({ id }: Input) => resolveDocument(id));
