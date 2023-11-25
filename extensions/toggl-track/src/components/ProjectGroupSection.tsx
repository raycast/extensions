import { List } from "@raycast/api";
import { ProjectGroup } from "../context/ProjectGroup";
import ProjectListItem from "./ProjectListItem";

export default function ProjectGroupSection({ group }: { group: ProjectGroup }) {
  return (
    <List.Section title={group.workspace.name} subtitle={group.client?.name}>
      {group.projects.map((project) => (
        <ProjectListItem key={project.id} project={project} />
      ))}
    </List.Section>
  );
}
