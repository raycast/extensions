import { getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { basename, resolve } from "path";
import { homedir } from "os";

interface RawPreferences {
  projectDirectories: string;
  backlogPath: string;
}

export interface ProjectConfig {
  backlogPath: string;
  projects: { name: string; path: string }[];
}

function expandPath(p: string): string {
  const trimmed = p.trim();
  if (trimmed.startsWith("~/") || trimmed === "~") {
    return resolve(homedir(), trimmed.slice(2));
  }
  return resolve(trimmed);
}

export function getProjectConfig(): ProjectConfig {
  const prefs = getPreferenceValues<RawPreferences>();
  const backlogPath = prefs.backlogPath ? expandPath(prefs.backlogPath) : "backlog";

  const projects = prefs.projectDirectories
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const full = expandPath(p);
      return { name: basename(full), path: full };
    });

  return { backlogPath, projects };
}

export function useActiveProject(): [string, (path: string) => void, ProjectConfig] {
  const config = getProjectConfig();
  const [activeProject, setActiveProject] = useCachedState<string>("active-project", config.projects[0]?.path || "");

  // If the cached project was removed from preferences, fall back to the first one
  const isValid = config.projects.some((p) => p.path === activeProject);
  const effectivePath = isValid ? activeProject : config.projects[0]?.path || "";

  return [effectivePath, setActiveProject, config];
}
