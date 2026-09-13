import { client } from "./linearUtils";
import { withToolAuth } from "./resolveToolWorkspace";

type Input = {
  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};

/* eslint-disable @typescript-eslint/no-unused-vars */
export default withToolAuth(async (_input: Input) => client().organization);
/* eslint-enable @typescript-eslint/no-unused-vars */
