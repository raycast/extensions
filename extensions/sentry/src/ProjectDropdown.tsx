import { List } from "@raycast/api";
import { useProjects } from "./sentry";
import { Project } from "./types";

function ProjectDropdownItem(props: { project: Project }) {
  const slug = `${props.project.organization.slug}/${props.project.slug}`;
  return <List.Dropdown.Item value={slug} title={slug} />;
}

export function ProjectDropdown(props: {
  onProjectChange: (project?: Project) => void;
  onError: (error: Error) => void;
}) {
  const { data, error } = useProjects();

  function handleProjectChange(slug: string) {
    const [orgSlug, projectSlug] = slug.split("/");
    const project = data?.find((p) => p.organization.slug === orgSlug && p.slug === projectSlug);
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
