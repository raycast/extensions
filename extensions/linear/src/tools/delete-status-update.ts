import { client } from "./linearUtils";
import { withToolAuth } from "./resolveToolWorkspace";

type Input = {
  type: "project" | "initiative";
  id: string;
  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};

export default withToolAuth(async (input: Input) => {
  const result =
    input.type === "project"
      ? await client().archiveProjectUpdate(input.id)
      : await client().archiveInitiativeUpdate(input.id);
  return { success: result.success };
});
