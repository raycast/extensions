import { useMemo, useState } from "react";
import { useNavigation, Form, ActionPanel, Action, Icon, showToast, Toast, clearSearchBar } from "@raycast/api";
import { createTimeEntry, Project, Task } from "../api";
import { useMe, useWorkspaces, useProjects, useClients, useTags, useTasks } from "../hooks";
import { createProjectGroups } from "../helpers/createProjectGroups";

interface CreateTimeEntryFormParams {
  revalidateRunningTimeEntry: () => void;
  revalidateTimeEntries: () => void;
}

function CreateTimeEntryForm({ revalidateRunningTimeEntry, revalidateTimeEntries }: CreateTimeEntryFormParams) {
  const navigation = useNavigation();
  const { me, isLoadingMe } = useMe();
  const { workspaces, isLoadingWorkspaces } = useWorkspaces();
  const { projects, isLoadingProjects } = useProjects();
  const { clients, isLoadingClients } = useClients();
  const { tags, isLoadingTags } = useTags();
  const { tasks, isLoadingTasks } = useTasks();
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>();
  const [billable, setBillable] = useState<boolean>(false);

  const projectGroups = useMemo(
    () => createProjectGroups(projects, workspaces, clients),
    [projects, workspaces, clients],
  );

  async function handleSubmit(values: { description: string }) {
    const workspaceId = selectedProject?.workspace_id || me?.default_workspace_id;

    if (!workspaceId) {
      await showToast(Toast.Style.Failure, "Failed to start time entry");
      return;
    }

    try {
      await showToast(Toast.Style.Animated, "Starting time entry...");
      await createTimeEntry({
        projectId: selectedProject?.id,
        workspaceId,
        description: values.description,
        tags: selectedTags,
        taskId: selectedTask?.id,
        billable,
      });
      await showToast(Toast.Style.Success, "Started time entry");
      navigation.pop();
      revalidateRunningTimeEntry();
      revalidateTimeEntries();
      await clearSearchBar();
    } catch (e) {
      await showToast(Toast.Style.Failure, "Failed to start time entry");
    }
  }

  const projectTags = useMemo(() => {
    return tags.filter((tag) => tag.workspace_id === selectedProject?.workspace_id);
  }, [tags, selectedProject]);
  const projectTasks = useMemo<Task[]>(
    () => tasks.filter((task) => task.project_id == selectedProject?.id),
    [tasks, selectedProject],
  );

  const onProjectChange = (projectId: string) => {
    const project = projects.find((project) => project.id === parseInt(projectId));
    if (project) setSelectedProject(project);
  };
  const onTagsChange = (tags: string[]) => {
    setSelectedTags(tags);
  };
  const onTaskChange = (taskId: string) => {
    const task = tasks.find((task) => task.id == parseInt(taskId));
    setSelectedTask(task);
  };

  return (
    <Form
      isLoading={
        isLoadingMe || isLoadingWorkspaces || isLoadingProjects || isLoadingClients || isLoadingTags || isLoadingTasks
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Time Entry" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="description" title="Description" />
      <Form.Dropdown
        id="project"
        title="Project"
        defaultValue={selectedProject?.id.toString() ?? "-1"}
        onChange={onProjectChange}
      >
        <Form.Dropdown.Item key="-1" value="-1" title={"No Project"} icon={{ source: Icon.Circle }} />
        {projectGroups.map((group) => (
          <Form.Dropdown.Section
            key={group.key}
            title={`${group.workspace.name} ${group.client?.name ? `(${group.client?.name})` : ""}`}
          >
            {group.projects.map((project) => (
              <Form.Dropdown.Item
                key={project.id}
                value={project.id.toString()}
                title={project.name}
                icon={{ source: Icon.Circle, tintColor: project.color }}
              />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>
      {selectedProject && projectTasks.length > 0 && (
        <Form.Dropdown id="task" title="Task" defaultValue="-1" onChange={onTaskChange}>
          <Form.Dropdown.Item value={"-1"} title={"No task"} icon={{ source: Icon.Circle }} />
          {projectTasks.map((task) => (
            <Form.Dropdown.Item
              key={task.id}
              value={task.id.toString()}
              title={task.name}
              icon={{ source: Icon.Circle, tintColor: selectedProject.color }}
            />
          ))}
        </Form.Dropdown>
      )}
      {selectedProject?.billable && (
        <Form.Checkbox id="billable" label="" title="Billable" value={billable} onChange={setBillable} />
      )}
      <Form.TagPicker id="tags" title="Tags" onChange={onTagsChange}>
        {projectTags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} value={tag.name.toString()} title={tag.name} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

export default CreateTimeEntryForm;
