import { useCallback, useEffect } from "react";
import { useCachedState } from "@raycast/utils";
import { getGitStatus } from "../utils/git";
import {
  getStoredWorkspaces,
  getStoredApp,
  getWorkspaceApps,
  getStoredWalkthroughCompleted,
  setStoredWalkthroughCompleted,
  saveStoredApp,
  saveStoredWorkspaces,
  getStoredPinnedProjects,
  saveStoredPinnedProjects,
} from "../utils/storage";
import { Project, App, GitStatus } from "../types";
import { readdirSync } from "fs";
import path from "path";

export function useWorkspace() {
  const [workspaces, setWorkspaces] = useCachedState<string[]>("workspace-workspaces", []);
  const [pinnedProjects, setPinnedProjects] = useCachedState<string[]>("workspace-pinned-projects", []);
  const [defaultApp, setDefaultApp] = useCachedState<App | null>("default-app", null);
  const [workspaceApps, setWorkspaceApps] = useCachedState<Record<string, App>>("workspace-apps", {});
  const [projectGitStatus, setProjectGitStatus] = useCachedState<Record<string, GitStatus | null>>("git-status", {});
  const [walkthroughCompleted, setWalkthroughCompleted] = useCachedState<boolean>("walkthrough-completed", false);
  const [isLoading, setIsLoading] = useCachedState<boolean>("is-loading", true);

  const getSubdirectories = (parentPath: string): Project[] => {
    try {
      const entries = readdirSync(parentPath, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((entry) => ({
          name: entry.name,
          fullPath: path.join(parentPath, entry.name),
          parentFolder: parentPath,
        }));
    } catch {
      return [];
    }
  };

  const fetchGitStatuses = async (projects: Project[]) => {
    const statusMap: Record<string, GitStatus | null> = {};
    await Promise.all(
      projects.map(async (project) => {
        const status = await getGitStatus(project.fullPath);
        statusMap[project.fullPath] = status;
      }),
    );
    setProjectGitStatus((prev) => ({ ...prev, ...statusMap }));
  };

  const loadData = useCallback(async () => {
    const [storedWorkspaces, storedApp, storedWorkspaceApps, storedWalkthroughCompleted, storedPinnedProjects] =
      await Promise.all([
        getStoredWorkspaces(),
        getStoredApp(),
        getWorkspaceApps(),
        getStoredWalkthroughCompleted(),
        getStoredPinnedProjects(),
      ]);

    setWorkspaces(storedWorkspaces);
    setDefaultApp(storedApp);
    setWorkspaceApps(storedWorkspaceApps);
    setWalkthroughCompleted(storedWalkthroughCompleted);
    setPinnedProjects(storedPinnedProjects);

    const allProjects = storedWorkspaces.flatMap((workspace) => getSubdirectories(workspace));
    fetchGitStatuses(allProjects);
    setIsLoading(false);
  }, [setWorkspaces, setDefaultApp, setWorkspaceApps, setWalkthroughCompleted, setPinnedProjects, setIsLoading]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const setWalkthroughCompletedState = async (completed: boolean) => {
    await setStoredWalkthroughCompleted(completed);
    setWalkthroughCompleted(completed);
  };

  const togglePinProject = async (projectPath: string) => {
    const newPinned = pinnedProjects.includes(projectPath)
      ? pinnedProjects.filter((projectPathItem) => projectPathItem !== projectPath)
      : [...pinnedProjects, projectPath];

    await saveStoredPinnedProjects(newPinned);
    setPinnedProjects(newPinned);
  };

  const updateWorkspaces = async (newWorkspaces: string[]) => {
    await saveStoredWorkspaces(newWorkspaces);
    setWorkspaces(newWorkspaces);
  };

  const updateDefaultApp = async (app: App | null) => {
    if (app) await saveStoredApp(app);
    setDefaultApp(app);
  };

  return {
    workspaces,
    pinnedProjects,
    defaultApp,
    workspaceApps,
    projectGitStatus,
    isLoading,
    loadData,
    getSubdirectories,
    walkthroughCompleted,
    setWalkthroughCompleted: setWalkthroughCompletedState,
    togglePinProject,
    updateWorkspaces,
    updateDefaultApp,
  };
}
