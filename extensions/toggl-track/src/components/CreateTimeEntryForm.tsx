import { useMemo, useState } from "react";
import { useNavigation, Form, ActionPanel, Action, Icon, showToast, Toast, clearSearchBar } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { createTimeEntry, Client, Project, Task } from "../api";
import { useMe, useWorkspaces, useProjects, useClients, useTags, useTasks } from "../hooks";

interface CreateTimeEntryFormParams {
  revalidateRunningTimeEntry: () => void;
  revalidateTimeEntries: () => void;
}

function CreateTimeEntryForm({ revalidateRunningTimeEntry, revalidateTimeEntries }: CreateTimeEntryFormParams) {
  const navigation = useNavigation();
  const { me, isLoadingMe } = useMe();
  const { workspaces, isLoadingWorkspaces } = useWorkspaces();
  const { clients, isLoadingClients } = useClients();
  const { projects, isLoadingProjects } = useProjects();
  const { tasks, isLoadingTasks } = useTasks();
  const { tags, isLoadingTags } = useTags();

  const [selectedWorkspace, setSelectedWorkspace] = useCachedState("defaultWorspace", workspaces.at(0));
  const [selectedClient, setSelectedClient] = useState<Client | undefined>();
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [selectedTask, setSelectedTask] = useState<Task | undefined>();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  async function handleSubmit(values: { description: string; billable?: boolean }) {
    const workspaceId = selectedProject?.workspace_id || me?.default_workspace_id;

    if (!workspaceId) {
      await showToast(Toast.Style.Failure, "Failed to start time entry");
      return;
    }

    try {
      await showToast(Toast.Style.Animated, "Starting time entry...");
      await createTimeEntry({
        ...values,
        projectId: selectedProject?.id,
        workspaceId,
        tags: selectedTags,
        taskId: selectedTask?.id,
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

  const filteredClients = useMemo(() => {
    if (selectedProject) return clients.filter((client) => !client.archived && client.id == selectedProject.client_id);
    else return clients.filter((client) => !client.archived && client.wid == selectedWorkspace?.id);
  }, [projects, selectedWorkspace, selectedProject]);
  const filteredProjects = useMemo(() => {
    if (selectedClient)
      return projects.filter((project) => project.client_id == selectedClient.id && project.status != "archived");
    else
      return projects.filter(
        (project) => project.workspace_id == selectedWorkspace?.id && project.status != "archived",
      );
  }, [projects, selectedWorkspace, selectedClient]);
  const filteredTasks = useMemo(() => {
    if (selectedProject) return tasks.filter((task) => task.project_id == selectedProject.id);
    else if (selectedClient)
      return tasks.filter(
        (task) => task.project_id == projects.find((project) => project.client_id == selectedClient.id)?.id,
      );
    else return tasks.filter((task) => task.workspace_id == selectedWorkspace?.id);
  }, [tasks, selectedWorkspace, selectedClient, selectedProject]);

  const onWorkspaceChange = (workspaceId: string) => {
    const workspace = workspaces.find((workspace) => workspace.id === parseInt(workspaceId));
    if (workspace) setSelectedWorkspace(workspace);
    setSelectedClient(undefined);
    setSelectedProject(undefined);
    setSelectedTask(undefined);
    setSelectedTags([]);
  };
  const onProjectChange = (projectId: string) => {
    const project = projects.find((project) => project.id === parseInt(projectId));
    setSelectedProject(project);
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
      {workspaces.length > 1 && (
        <Form.Dropdown
          id="workspace"
          title="Workspace"
          defaultValue={selectedWorkspace?.id.toString()}
          onChange={onWorkspaceChange}
        >
          {workspaces.map((workspace) => (
            <Form.Dropdown.Item key={workspace.id} value={workspace.id.toString()} title={workspace.name} />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextField id="description" title="Description" autoFocus />
      <Form.Dropdown
        id="client"
        title="Client"
        defaultValue={selectedClient?.id.toString() ?? "-1"}
        onChange={(clientId) =>
          setSelectedClient(clientId == "-1" ? undefined : clients.find((client) => client.id == parseInt(clientId)))
        }
      >
        <Form.Dropdown.Item key="-1" value="-1" title={"No Client"} />
        {filteredClients.map((client) => (
          <Form.Dropdown.Item key={client.id} value={client.id.toString()} title={client.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="project"
        title="Project"
        defaultValue={selectedProject?.id.toString() ?? "-1"}
        onChange={onProjectChange}
      >
        <Form.Dropdown.Item key="-1" value="-1" title={"No Project"} icon={{ source: Icon.Circle }} />
        {filteredProjects.map((project) => (
          <Form.Dropdown.Item
            key={project.id}
            value={project.id.toString()}
            title={project.name}
            icon={{ source: Icon.Circle, tintColor: project.color }}
          />
        ))}
      </Form.Dropdown>
      {selectedProject && filteredTasks.length > 0 && (
        <Form.Dropdown id="task" title="Task" defaultValue="-1" onChange={onTaskChange}>
          <Form.Dropdown.Item value={"-1"} title={"No task"} icon={{ source: Icon.Circle }} />
          {filteredTasks.map((task) => (
            <Form.Dropdown.Item key={task.id} value={task.id.toString()} title={task.name} />
          ))}
        </Form.Dropdown>
      )}
      {selectedProject?.billable && <Form.Checkbox id="billable" label="" title="Billable" />}
      <Form.TagPicker id="tags" title="Tags" onChange={setSelectedTags} value={selectedTags}>
        {tags
          .filter((tag) => tag.workspace_id == selectedWorkspace?.id)
          .map((tag) => (
            <Form.TagPicker.Item key={tag.id} value={tag.name.toString()} title={tag.name} />
          ))}
      </Form.TagPicker>
    </Form>
  );
}

export default CreateTimeEntryForm;
