import { List, useNavigation, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useMemo, useRef } from "react";
import { CacheManager, Project } from "./CacheManager";
import ProjectView from "../ProjectView";
import { getProjects } from "../gcloud";

interface QuickProjectSwitcherProps {
  gcloudPath: string;
  onProjectSelect?: (projectId: string) => void;
}

export function QuickProjectSwitcher({ gcloudPath, onProjectSelect }: QuickProjectSwitcherProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const initialSetupDone = useRef(false);
  const { push } = useNavigation();

  useEffect(() => {
    async function loadProjects() {
      const cachedProjects = CacheManager.getProjectsList();
      if (cachedProjects) {
        setProjects(cachedProjects.projects);
        setIsLoading(false);

        const cachedProject = CacheManager.getSelectedProject();
        if (cachedProject) {
          setSelectedProject(cachedProject.projectId);
          initialSetupDone.current = true;
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
  }, [gcloudPath]);

  const handleProjectChange = (projectId: string) => {
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
        return (a.name || "").localeCompare(b.name || "");
      }

      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;

      return aIndex - bIndex;
    });
  }, [projects]);

  return (
    <List.Dropdown
      tooltip="Search and switch projects"
      value={selectedProject}
      onChange={handleProjectChange}
      isLoading={isLoading}
    >
      {sortedProjects.map((project) => (
        <List.Dropdown.Item key={project.id} title={`${project.name || ""}`} value={project.id} />
      ))}
    </List.Dropdown>
  );
}
