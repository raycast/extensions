import { Icon, List } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { CacheManager, Project } from "../utils/CacheManager";
import { getProjects } from "../gcloud";

interface ProjectDropdownProps {
  gcloudPath: string;
  value: string | null;
  onChange: (projectId: string) => void;
  pinnedProjects?: string[];
}

export function ProjectDropdown({ gcloudPath, value, onChange, pinnedProjects }: ProjectDropdownProps) {
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

  // Sort with pinned projects first, then recent, then alphabetical
  const { pinnedList, recentProjects, otherProjects } = useMemo(() => {
    if (!projects.length) return { pinnedList: [], recentProjects: [], otherProjects: [] };

    const pinnedIds = pinnedProjects ?? CacheManager.getPinnedProjects();
    const pinnedSet = new Set(pinnedIds);
    const recentlyUsedIds = CacheManager.getRecentlyUsedProjects();
    const recentSet = new Set(recentlyUsedIds);

    const projectsById = new Map(projects.map((p) => [p.id, p]));
    const pinned: Project[] = [];
    const recent: Project[] = [];
    const others: Project[] = [];

    // Add pinned projects in pinned order
    for (const id of pinnedIds) {
      const project = projectsById.get(id);
      if (project) {
        pinned.push(project);
      }
    }

    // Add recent projects (excluding pinned)
    for (const id of recentlyUsedIds) {
      if (pinnedSet.has(id)) continue;
      const project = projectsById.get(id);
      if (project) {
        recent.push(project);
      }
    }

    // Add remaining projects alphabetically
    for (const project of projects) {
      if (!pinnedSet.has(project.id) && !recentSet.has(project.id)) {
        others.push(project);
      }
    }

    others.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));

    return { pinnedList: pinned, recentProjects: recent, otherProjects: others };
  }, [projects, pinnedProjects]);

  return (
    <List.Dropdown tooltip="Switch Project" value={value || undefined} onChange={onChange} isLoading={isLoading}>
      {pinnedList.length > 0 && (
        <List.Dropdown.Section title="Pinned Projects">
          {pinnedList.map((project) => (
            <List.Dropdown.Item
              key={project.id}
              title={project.name || project.id}
              value={project.id}
              icon={Icon.Pin}
            />
          ))}
        </List.Dropdown.Section>
      )}

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
