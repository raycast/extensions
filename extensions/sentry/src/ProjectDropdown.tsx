import { Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";
import { useProjects } from "./hooks";
import { Project } from "./types";

function ProjectDropdownItem(props: { project: Project }) {
  return (
    <List.Dropdown.Item
      value={props.project.slug}
      title={props.project.slug}
      icon={{ source: Icon.Circle, tintColor: props.project.color }}
    />
  );
}

export function ProjectDropdown(props: { onProjectChange: (project: Project) => void }) {
  const { data: projects, error } = useProjects();

  useEffect(() => {
    if (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed retrieving projects", message: error.message });
    }
  }, [error]);

  function handleProjectChange(projectSlug: string) {
    const project = projects?.find((p) => p.slug === projectSlug);
    if (project) {
      props.onProjectChange(project);
    } else {
      console.error("Could not find project", projectSlug);
    }
  }

  return (
    <List.Dropdown tooltip="Change Project" onChange={handleProjectChange} storeValue>
      {projects?.map((project) => (
        <ProjectDropdownItem key={project.id} project={project} />
      ))}
    </List.Dropdown>
  );
}
