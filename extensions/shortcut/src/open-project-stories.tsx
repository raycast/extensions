import { List } from "@raycast/api";
import { useProjects } from "./hooks";

export default function OpenProjects() {
  const { data: projects, isValidating } = useProjects();

  return (
    <List isLoading={!projects || isValidating}>
      {projects?.map((project) => (
        <List.Item title={project.name} />
      ))}
    </List>
  );
}
