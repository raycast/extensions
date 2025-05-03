import { EventEmitter } from "stream";

import { IWorkspace } from "./Models/IWorkspace";
import { IWorkspaceError } from "./Models/IWorkspaceError";
import { IWorkspaceUpdate } from "./Models/IWorkspaceUpdate";
import { WorkspaceStreamer } from "./WorkspaceStreamer";

export class WorkspaceManager extends EventEmitter {
  private static instance: WorkspaceManager;
  public static workspaces: Map<string, IWorkspace>;
  public static api: WorkspaceStreamer;

  // Gitpod PAT Token
  static token: string;

  private static user_id: string;

  constructor(token: string) {
    super();
    if (!WorkspaceManager.api) {
      WorkspaceManager.api = new WorkspaceStreamer(token);
    }
    WorkspaceManager.token = token;
  }

  static getInstance(token: string) {
    if (!WorkspaceManager.instance) {
      WorkspaceManager.instance = new WorkspaceManager(token);
    }
    return WorkspaceManager.instance;
  }

  async init() {
    // this method will give you all the workspaces
    if (WorkspaceManager.instance) {
      return;
    }
    try {
      WorkspaceManager.workspaces = await IWorkspace.fetchAll(WorkspaceManager.token);
      this.emit("workspaceUpdated", WorkspaceManager.workspaces);
    } catch (e: any) {
      this.emit("errorOccured", e as IWorkspaceError);
      return;
    }

    WorkspaceManager.api.on("instanceUpdated", (updateInstance: IWorkspaceUpdate) => {
      const targetWorkspace = WorkspaceManager.workspaces.get(updateInstance.workspaceId);
      // don't update anything when the workspace is already in the same state
      updateInstance.status.phase = "PHASE_" + updateInstance.status.phase.toUpperCase();
      if (targetWorkspace === undefined || targetWorkspace.getStatus().phase === updateInstance.status.phase) {
        return;
      }

      // update when the workspace is not in the state
      targetWorkspace.setStatus(updateInstance.status);
      targetWorkspace.setIDEURL(updateInstance.ideUrl);
      WorkspaceManager.workspaces = WorkspaceManager.workspaces.set(updateInstance.workspaceId, targetWorkspace);

      // Workspace has been updated, its time to tell our listeners i.e. UI Components, that workspaces have been updated and it's time to change things.
      this.emit("workspaceUpdated", targetWorkspace);
    });

    WorkspaceManager.api.on("errorOccured", (error: IWorkspaceError) => {
      this.emit("errorOccured", error);
    });
  }
}
