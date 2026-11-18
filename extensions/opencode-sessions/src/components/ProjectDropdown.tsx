import { Icon, List } from "@raycast/api";

import { Project } from "../types";
import { repoName } from "../utils";

interface ProjectDropdownProps {
  projects: Project[];
  onProjectChange: (projectID: string) => void;
}

export function ProjectDropdown({ projects, onProjectChange }: ProjectDropdownProps) {
  const globalProject = projects.find((p) => p.worktree === "/");
  const repoProjects = projects.filter((p) => p.worktree !== "/");
  const sorted = [...repoProjects].sort((a, b) => repoName(a.worktree).localeCompare(repoName(b.worktree)));

  return (
    <List.Dropdown tooltip="Filter by Project" storeValue onChange={onProjectChange}>
      <List.Dropdown.Item title="All Projects" value="all" icon={Icon.AppWindowGrid3x3} />
      {globalProject && <List.Dropdown.Item title="No Project" value={globalProject.id} icon={Icon.Minus} />}
      <List.Dropdown.Section title="Projects">
        {sorted.map((project) => (
          <List.Dropdown.Item
            key={project.id}
            title={repoName(project.worktree)}
            value={project.id}
            icon={Icon.Folder}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
