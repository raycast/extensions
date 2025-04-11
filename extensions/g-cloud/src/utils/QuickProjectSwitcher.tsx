import { List, useNavigation } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { CacheManager, Project } from "./CacheManager";
import ProjectView from "../ProjectView";

interface QuickProjectSwitcherProps {
  gcloudPath: string;
  onProjectSelect?: (projectId: string) => void;
}

export function QuickProjectSwitcher({ gcloudPath, onProjectSelect }: QuickProjectSwitcherProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const { push } = useNavigation();

  useEffect(() => {
    const cachedProjects = CacheManager.getProjectsList();
    if (cachedProjects) {
      setProjects(cachedProjects.projects);

      const cachedProject = CacheManager.getSelectedProject();
      if (cachedProject) {
        setSelectedProject(cachedProject.projectId);
      }
    }

    const recentlyUsed = CacheManager.getRecentlyUsedProjects();

    if (recentlyUsed.length > 0 && !selectedProject) {
      setSelectedProject(recentlyUsed[0]);
    }
  }, []);

  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);

    CacheManager.saveSelectedProject(projectId);

    if (onProjectSelect) {
      onProjectSelect(projectId);
    } else {
      push(<ProjectView projectId={projectId} gcloudPath={gcloudPath} />);
    }
  };

  const sortedProjects = useMemo(() => {
    if (!projects.length) return [];

    const recentlyUsed = CacheManager.getRecentlyUsedProjects();

    return [...projects].sort((a, b) => {
      const aIndex = recentlyUsed.indexOf(a.id);
      const bIndex = recentlyUsed.indexOf(b.id);

      if (aIndex === -1 && bIndex === -1) {
        return a.name.localeCompare(b.name);
      }

      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;

      return aIndex - bIndex;
    });
  }, [projects]);

  return (
    <List.Dropdown tooltip="Switch Project" value={selectedProject} onChange={handleProjectChange}>
      {sortedProjects.map((project) => (
        <List.Dropdown.Item key={project.id} title={project.name || project.id} value={project.id} />
      ))}
    </List.Dropdown>
  );
}
