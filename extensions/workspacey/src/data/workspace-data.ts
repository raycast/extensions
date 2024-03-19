import { ActionData } from "./action-data";
import { Workspace } from "./workspace";

export type WorkspaceData = {
  workspace: Workspace;
  actions: ActionData[];
};
