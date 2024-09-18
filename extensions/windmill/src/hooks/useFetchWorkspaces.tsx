import { LocalStorage } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { WorkspaceConfig } from "../types";
import { v4 as uuidv4 } from "uuid";
import { clearCache } from "../cache";

export function useFetchWorkspaces() {
  const [workspaces, setWorkspaces] = useState<WorkspaceConfig[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const _fetchWorkspaces = async () => {
    try {
      setIsLoading(true);
      setWorkspaces(await fetchWorkspaces());
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    _fetchWorkspaces();
  }, []);

  const _saveWorkspace = useCallback(async (workspace: WorkspaceConfig) => {
    const workspaces = await saveWorkspace(workspace);
    setWorkspaces(workspaces);
  }, []);

  const _removeWorkspace = useCallback(async (id: string) => {
    const workspaces = await removeWorkspace(id);
    setWorkspaces(workspaces);
  }, []);

  return {
    workspaces,
    fetchWorkspaces: _fetchWorkspaces,
    saveWorkspace: _saveWorkspace,
    removeWorkspace: _removeWorkspace,
    isLoading,
  };
}

export async function fetchWorkspaces(): Promise<WorkspaceConfig[]> {
  const storedWorkspaces = await LocalStorage.getItem("workspaces");
  if (typeof storedWorkspaces === "string") {
    return JSON.parse(storedWorkspaces);
  } else {
    return [];
  }
}

export async function removeWorkspace(id: string) {
  const storedWorkspaces = await LocalStorage.getItem("workspaces");
  let workspaces: WorkspaceConfig[] = [];

  try {
    if (typeof storedWorkspaces === "string") {
      workspaces = JSON.parse(storedWorkspaces);
    }
  } catch (error) {
    workspaces = [];
    console.error(error);
  }

  const newWorkspaces = workspaces.filter((workspace: WorkspaceConfig) => workspace.id !== id);

  clearCache();

  await LocalStorage.setItem("workspaces", JSON.stringify(newWorkspaces));
  return workspaces;
}

export async function saveWorkspace(workspace: WorkspaceConfig) {
  const storedWorkspaces = await LocalStorage.getItem("workspaces");
  let workspaces: WorkspaceConfig[] = [];

  try {
    if (typeof storedWorkspaces === "string") {
      workspaces = JSON.parse(storedWorkspaces);
    }
  } catch (error) {
    workspaces = [];
    console.error(error);
  }

  if (workspace.id) {
    // If the workspace exists, update it
    const index = workspaces.findIndex((c) => c.id === workspace.id);
    if (index >= 0) {
      workspaces[index] = workspace;
    } else {
      throw new Error("Workspace Not Found!");
    }
  } else {
    workspace.id = uuidv4();
    workspaces.push(workspace);
  }

  clearCache();

  await LocalStorage.setItem("workspaces", JSON.stringify(workspaces));
  return workspaces;
}
