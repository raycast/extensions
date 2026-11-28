import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useMemo } from "react";
import { LocalProject, PackageManagerName } from "../types";
import { discoverLocalProjects } from "./projects";
import { getActiveProjectPath, getCustomProjectPaths, getPinnedProjectPaths, setActiveProjectPath } from "./storage";

export function useProjects() {
  const prefs = getPreferenceValues<Preferences>();
  const scanDepth = Number.parseInt(prefs.scanDepth ?? "3", 10) || 3;
  const defaultPm = (prefs.defaultPackageManager ?? "auto") as "auto" | PackageManagerName;

  const { data, isLoading, revalidate } = useCachedPromise(
    async (dirs: string, depth: number, pm: "auto" | PackageManagerName) => {
      const [activePath, customPaths, pinnedPaths] = await Promise.all([
        getActiveProjectPath(),
        getCustomProjectPaths(),
        getPinnedProjectPaths(),
      ]);

      const projects = discoverLocalProjects({
        projectDirectoriesPref: dirs,
        scanDepth: depth,
        customPaths,
        pinnedPaths,
        activeProjectPath: activePath,
        defaultPackageManager: pm,
      });

      const resolvedActive = (activePath && projects.find((p) => p.path === activePath)?.path) ?? projects[0]?.path;

      return {
        projects,
        activeProjectPath: resolvedActive,
      };
    },
    [prefs.projectDirectories ?? "", scanDepth, defaultPm],
    { keepPreviousData: true },
  );

  const projects: LocalProject[] = useMemo(() => data?.projects ?? [], [data?.projects]);
  const activeProjectPath = data?.activeProjectPath;
  const activeProject = useMemo(
    () => projects.find((p) => p.path === activeProjectPath) ?? projects[0],
    [projects, activeProjectPath],
  );

  const selectActiveProject = useCallback(
    async (projectPath: string) => {
      await setActiveProjectPath(projectPath);
      await revalidate();
    },
    [revalidate],
  );

  return {
    projects,
    activeProject,
    activeProjectPath,
    selectActiveProject,
    isLoading,
    revalidate,
  };
}
