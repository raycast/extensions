import { List } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { CacheManager, Project } from "../utils/CacheManager";
import { getProjects } from "../gcloud";

interface ProjectDropdownProps {
  gcloudPath: string;
  value: string | null;
  onChange: (projectId: string) => void;
}

export function ProjectDropdown({ gcloudPath, value, onChange }: ProjectDropdownProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProjects() {
      // Try cache first
      const cachedProjects = CacheManager.getProjectsList();
      if (cachedProjects) {
        setProjects(cachedProjects.projects);
        setIsLoading(false);
      }

      // Background refresh
      try {
        const fetchedProjects = await getProjects(gcloudPath);
        CacheManager.saveProjectsList(fetchedProjects);
        setProjects(fetchedProjects);
      } catch (error) {
        console.error("Error fetching projects:", error);
        // Keep using cached projects if available
      } finally {
        setIsLoading(false);
      }
    }

    loadProjects();
  }, [gcloudPath]);

  // Sort with recent projects first
  const { recentProjects, otherProjects } = useMemo(() => {
    if (!projects.length) return { recentProjects: [], otherProjects: [] };

    const recentlyUsedIds = CacheManager.getRecentlyUsedProjects();
    const recentSet = new Set(recentlyUsedIds);

    const recent: Project[] = [];
    const others: Project[] = [];

    // Add recent projects in order
    for (const id of recentlyUsedIds) {
      const project = projects.find((p) => p.id === id);
      if (project) {
        recent.push(project);
      }
    }

    // Add remaining projects alphabetically
    for (const project of projects) {
      if (!recentSet.has(project.id)) {
        others.push(project);
      }
    }

    others.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));

    return { recentProjects: recent, otherProjects: others };
  }, [projects]);

  return (
    <List.Dropdown tooltip="Switch Project" value={value || undefined} onChange={onChange} isLoading={isLoading}>
      {recentProjects.length > 0 && (
        <List.Dropdown.Section title="Recent Projects">
          {recentProjects.map((project) => (
            <List.Dropdown.Item key={project.id} title={project.name || project.id} value={project.id} />
          ))}
        </List.Dropdown.Section>
      )}

      {otherProjects.length > 0 && (
        <List.Dropdown.Section title="All Projects">
          {otherProjects.map((project) => (
            <List.Dropdown.Item key={project.id} title={project.name || project.id} value={project.id} />
          ))}
        </List.Dropdown.Section>
      )}

      {projects.length === 0 && !isLoading && <List.Dropdown.Item title="No projects found" value="" />}
    </List.Dropdown>
  );
}
