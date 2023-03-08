import { List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { useProjects } from "./sentry";
import { Project } from "./types";

function ProjectDropdownItem(props: { project: Project }) {
  return (
    <List.Dropdown.Item
      value={props.project.slug}
      title={props.project.slug}
      icon={getAvatarIcon(props.project.name, { background: props.project.color })}
    />
  );
}

export function ProjectDropdown(props: {
  onProjectChange: (project?: Project) => void;
  onError: (error: Error) => void;
}) {
  const { data, error } = useProjects();

  function handleProjectChange(projectSlug: string) {
    const project = data?.find((p) => p.slug === projectSlug);
    if (project) {
      props.onProjectChange(project);
    } else {
      console.error("Could not find project", projectSlug);
    }
  }

  if (error) {
    props.onError(error);
  }

  return (
    <List.Dropdown tooltip="Change Project" onChange={handleProjectChange} storeValue>
      {data?.map((project) => (
        <ProjectDropdownItem key={project.id} project={project} />
      ))}
    </List.Dropdown>
  );
}
