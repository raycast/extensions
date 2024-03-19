import { LocalStorage } from "@raycast/api";
import { Workspace } from "../workspace";
import { WorkspaceData } from "../workspace-data";
import { ActionData } from "../action-data";

export async function getWorkspaces(): Promise<Workspace[]> {
  const workspaces = await LocalStorage.getItem("workspaces");
  if (!workspaces) return [];

  return JSON.parse(workspaces.toString());
}

export async function getWorkspacesData(): Promise<WorkspaceData[]> {
  const workspaceData = await LocalStorage.getItem("workspaceData");
  if (!workspaceData) return [];

  return JSON.parse(workspaceData.toString());
}

export async function getWorkspacesDataForWorkspaceId(workspaceId: string): Promise<WorkspaceData | undefined> {
  const workspacesData = await getWorkspacesData();
  if (!workspacesData) return undefined;
  return workspacesData.find((item) => item.workspace.id === workspaceId);
}

export async function saveWorkspacesData(workspace: WorkspaceData) {
  const current = await LocalStorage.getItem("workspaceData");
  if (current) {
    const data = JSON.parse(current.toString()) as WorkspaceData[];
    const foundWorkspace = data.find((item) => item.workspace.id === workspace.workspace.id);
    if (foundWorkspace) {
      foundWorkspace.actions.push(...workspace.actions);
    } else {
      data.push(workspace);
    }
    await LocalStorage.setItem("workspaceData", JSON.stringify(data));
  } else {
    await LocalStorage.setItem("workspaceData", JSON.stringify([workspace]));
  }
}

export async function deleteAction(workspaceId: string, actionId: string) {
  const workspacesData = await getWorkspacesData();
  if (!workspacesData) {
    throw new Error("Workspace not exist");
  }

  const foundWorkspace = workspacesData.find((item) => item.workspace.id === workspaceId);
  if (!foundWorkspace) {
    throw new Error("Workspace not exist");
  }

  foundWorkspace.actions = foundWorkspace.actions.filter((item) => item.id !== actionId);
  await LocalStorage.setItem("workspaceData", JSON.stringify(workspacesData));
}

export async function editAction(workspaceId: string, modifiedAction: ActionData) {
  const workspacesData = await getWorkspacesData();
  if (!workspacesData) {
    throw new Error("Workspace not exist");
  }

  const foundWorkspace = workspacesData.find((item) => item.workspace.id === workspaceId);
  if (!foundWorkspace) {
    throw new Error("Workspace not exist");
  }

  const index = foundWorkspace.actions.findIndex((item) => item.id === modifiedAction.id);
  if (index === -1) {
    throw new Error("Action not exist");
  }

  foundWorkspace.actions[index] = modifiedAction;

  await LocalStorage.setItem("workspaceData", JSON.stringify(workspacesData));
}

export async function saveWorkspace(workspace: Workspace) {
  const current = await getWorkspaces();
  if (current) {
    current.push(workspace);
    await LocalStorage.setItem("workspaces", JSON.stringify(current));
  } else {
    await LocalStorage.setItem("workspaces", JSON.stringify([workspace]));
  }
}

export async function deleteWorkspace(workspaceId: string) {
  const workspaces = await getWorkspaces();
  if (!workspaces) {
    throw new Error("Workspace not exist");
  }

  //delete workspace data
  const workspacesData = await getWorkspacesData();
  if (!workspacesData) {
    throw new Error("Workspace not exist");
  }

  const filteredData = workspacesData.filter((item) => item.workspace.id !== workspaceId);
  const filteredWorkspaces = workspaces.filter((item) => item.id !== workspaceId);

  await LocalStorage.setItem("workspaces", JSON.stringify(filteredWorkspaces));
  await LocalStorage.setItem("workspaceData", JSON.stringify(filteredData));
}
