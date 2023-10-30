import { useNavigation, Form, ActionPanel, Action, Icon, showToast, Toast, clearSearchBar } from "@raycast/api";
import toggl from "../toggl";
import { storage } from "../storage";
import { Project, Task } from "../toggl/types";
import { useAppContext } from "../context";
import { useMemo, useState } from "react";

function CreateTimeEntryForm({ project, description }: { project?: Project; description?: string }) {
  const navigation = useNavigation();
  const { projects, tags, tasks, isLoading, projectGroups, me } = useAppContext();
  const [selectedProject, setSelectedProject] = useState<Project | undefined>(project);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>();
  const [billable, setBillable] = useState<boolean>(false);

  async function handleSubmit(values: { description: string }) {
    const workspaceId = selectedProject?.workspace_id || me?.default_workspace_id;

    if (!workspaceId) {
      await showToast(Toast.Style.Failure, "Failed to start time entry");
      return;
    }

    try {
      await toggl.createTimeEntry({
        projectId: selectedProject?.id,
        workspaceId,
        description: values.description,
        tags: selectedTags,
        taskId: selectedTask?.id,
        billable,
      });
      await showToast(Toast.Style.Animated, "Starting time entry...");
      await storage.runningTimeEntry.refresh();
      await showToast(Toast.Style.Success, "Started time entry");
      navigation.pop();
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
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Time Entry" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="description" title="Description" defaultValue={description} />
      <Form.Dropdown
        id="project"
        title="Project"
        defaultValue={selectedProject?.id.toString()}
        onChange={onProjectChange}
      >
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
      <Form.TagPicker id="tags" title="Tags" onChange={onTagsChange}>
        {projectTags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} value={tag.name.toString()} title={tag.name} />
        ))}
      </Form.TagPicker>
      {selectedProject?.billable && (
        <Form.Checkbox id="billable" label="" title="Billable" value={billable} onChange={setBillable} />
      )}
    </Form>
  );
}

export default CreateTimeEntryForm;
