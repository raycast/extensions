import { List, useNavigation, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useMemo, useRef } from "react";
import { CacheManager, Project } from "./CacheManager";
import ProjectView from "../ProjectView";
import { getProjects } from "../gcloud";

interface QuickProjectSwitcherProps {
  gcloudPath: string;
  currentProjectId?: string;
  onProjectSelect?: (projectId: string) => void;
}

export function QuickProjectSwitcher({ gcloudPath, currentProjectId, onProjectSelect }: QuickProjectSwitcherProps) {
  const [projects, setProjects] = useState<Project[]>(() => CacheManager.getProjectsList()?.projects ?? []);
  const [selectedProject, setSelectedProject] = useState<string>(
    () => currentProjectId || CacheManager.getSelectedProject()?.projectId || "",
  );
  const [isLoading, setIsLoading] = useState<boolean>(() => !CacheManager.getProjectsList());
  const initialSetupDone = useRef(Boolean(currentProjectId));
  const { push } = useNavigation();

  useEffect(() => {
    if (currentProjectId) {
      setSelectedProject(currentProjectId);
      initialSetupDone.current = true;
    }
  }, [currentProjectId]);

  useEffect(() => {
    async function loadProjects() {
      const cachedProjects = CacheManager.getProjectsList();
      if (cachedProjects) {
        setProjects(cachedProjects.projects);
        setIsLoading(false);

        if (!currentProjectId) {
          const cachedProject = CacheManager.getSelectedProject();
          if (cachedProject) {
            setSelectedProject(cachedProject.projectId);
            initialSetupDone.current = true;
          }
        }
      } else {
        // No cached projects, fetch them
        try {
          const loadingToast = await showToast({
            style: Toast.Style.Animated,
            title: "Loading projects...",
          });

          const fetchedProjects = await getProjects(gcloudPath);
          CacheManager.saveProjectsList(fetchedProjects);
          setProjects(fetchedProjects);

          loadingToast.hide();

          if (!initialSetupDone.current) {
            const recentlyUsed = CacheManager.getRecentlyUsedProjects();
            if (recentlyUsed.length > 0) {
              setSelectedProject(recentlyUsed[0]);
              initialSetupDone.current = true;
            }
          }
        } catch (error) {
          console.error("Error fetching projects:", error);
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to load projects",
            message: error instanceof Error ? error.message : "Unknown error occurred",
          });
        } finally {
          setIsLoading(false);
        }
      }
    }

    loadProjects();
  }, [gcloudPath, currentProjectId]);

  const handleProjectChange = (projectId: string) => {
    const activeProject = currentProjectId || selectedProject;
    if (!projectId || projectId === activeProject) {
      return;
    }

    setSelectedProject(projectId);
    CacheManager.saveSelectedProject(projectId);

    if (onProjectSelect) {
      onProjectSelect(projectId);
    } else {
      try {
        push(<ProjectView projectId={projectId} gcloudPath={gcloudPath} />);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to open project view",
          message: error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }
  };

  const sortedProjects = useMemo(() => {
    if (!projects.length) return [];

    const recentlyUsed = CacheManager.getRecentlyUsedProjects();

    return [...projects].sort((a, b) => {
      const aIndex = recentlyUsed.indexOf(a.id);
      const bIndex = recentlyUsed.indexOf(b.id);

      if (aIndex === -1 && bIndex === -1) {
        return (a.name || a.id).localeCompare(b.name || b.id);
      }

      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;

      return aIndex - bIndex;
    });
  }, [projects]);

  const hasCurrentProject = Boolean(selectedProject && sortedProjects.some((p) => p.id === selectedProject));

  return (
    <List.Dropdown
      tooltip="Search and switch projects"
      value={selectedProject || undefined}
      onChange={handleProjectChange}
      isLoading={isLoading}
    >
      {selectedProject && !hasCurrentProject && (
        <List.Dropdown.Item key={selectedProject} title={selectedProject} value={selectedProject} />
      )}
      {sortedProjects.map((project) => (
        <List.Dropdown.Item key={project.id} title={project.name || project.id} value={project.id} />
      ))}
    </List.Dropdown>
  );
}
