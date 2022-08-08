import { Action, ActionPanel, Icon, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { getProjects } from "./api/hakuna";
import { useCachedPromise } from "@raycast/utils";
import { Project, Task } from "./@types/models";

export default function ProjectList() {
  const { data: projects, isLoading } = useCachedPromise(getProjects);

  return (
    <List isLoading={isLoading} navigationTitle="Projects">
      {projects?.map((project) => (
        <List.Item
          key={project.id}
          title={project.name}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Push
                  title="Open Project Tasks"
                  icon={Icon.Binoculars}
                  target={<ListTasks project={project} />}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ListTasks({ project }: { project: Project }) {
  const selectTask = async (task: Task) => {
    const toast = new Toast({ style: Toast.Style.Animated, title: `Changing to ${project.name}/${task.name}...` });

    try {
      toast.show();
      await Promise.all([
        LocalStorage.setItem("selectedTask", task.id),
        LocalStorage.setItem("selectedProject", project.id),
      ]);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.hide();
    } catch (error: unknown) {
      showToast(Toast.Style.Failure, (error as Error).message);
      return;
    }
  };
  return (
    <List navigationTitle="Tasks">
      {project.tasks.map((task) => (
        <List.Item
          key={task.id}
          title={task.name}
          actions={
            <ActionPanel>
              <Action title="Select" onAction={() => selectTask(task)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
