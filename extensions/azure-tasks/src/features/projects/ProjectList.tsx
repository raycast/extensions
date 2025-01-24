import { List, Icon, Action, ActionPanel, useNavigation, open } from "@raycast/api";
import { Project } from "../../models/project";
import { fetchProjects } from "../../api/fetchProjects";
import TaskList from "../tasks/TaskList";

export default function ProjectList() {
  const { push } = useNavigation();
  const { data, isLoading: isProjectLoading } = fetchProjects();

  return (
    <List isLoading={isProjectLoading}>
      {data?.value.map((project: Project) => (
        <List.Item
          icon={Icon.Code}
          key={project.id}
          title={project.name}
          subtitle={project.description?.length > 70 ? `${project.description.slice(0, 70)}...` : project.description}
          actions={
            <ActionPanel>
              <Action title="Show Tasks" onAction={() => push(<TaskList projectName={project.name} />)} />
              <Action title="Go to Browser" onAction={() => open(project.url)} />
            </ActionPanel>
          }
          accessories={[
            {
              text: "Project",
            },
          ]}
        />
      ))}
    </List>
  );
}
