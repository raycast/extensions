import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  clearSearchBar,
  showToast,
  useNavigation,
  confirmAlert,
} from "@raycast/api";
import { useCachedState, showFailureToast } from "@raycast/utils";
import { useMemo, useState } from "react";

import { Client, Project, Task, TimeEntry, TimeEntryMetaData, createTimeEntry, createTask } from "@/api";
import { showClientsInForm, showProjectsInForm, showTasksInForm, showTagsInForm } from "@/helpers/preferences";
import { useClients, useMe, useProjects, useTags, useTasks, useWorkspaces } from "@/hooks";

interface CreateTimeEntryFormParams {
  revalidateRunningTimeEntry: () => void;
  revalidateTimeEntries: () => void;
  initialValues?: TimeEntry & TimeEntryMetaData;
}

function CreateTimeEntryForm({
  revalidateRunningTimeEntry,
  revalidateTimeEntries,
  initialValues,
}: CreateTimeEntryFormParams) {
  const navigation = useNavigation();
  const { me, isLoadingMe } = useMe();
  const { workspaces, isLoadingWorkspaces } = useWorkspaces();
  const { clients, isLoadingClients } = showClientsInForm ? useClients() : { clients: [], isLoadingClients: false };
  const { projects, isLoadingProjects } = showProjectsInForm
    ? useProjects()
    : { projects: [], isLoadingProjects: false };
  const { tasks, isLoadingTasks, revalidateTasks } = showTasksInForm
    ? useTasks()
    : { tasks: [], isLoadingTasks: false, revalidateTasks: () => {} };
  const { tags, isLoadingTags } = showTagsInForm ? useTags() : { tags: [], isLoadingTags: false };

  const [selectedWorkspace, setSelectedWorkspace] = useCachedState("defaultWorkspace", workspaces.at(0)?.id);
  const [selectedClient, setSelectedClient] = useState<Client | undefined>(() => {
    return showClientsInForm ? clients.find((client) => client.name === initialValues?.client_name) : undefined;
  });
  const [selectedProject, setSelectedProject] = useState<Project | undefined>(() => {
    return showProjectsInForm ? projects.find((project) => project.id === initialValues?.project_id) : undefined;
  });
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(() => {
    return showTasksInForm ? tasks.find((task) => task.id === initialValues?.task_id) : undefined;
  });
  const [selectedTags, setSelectedTags] = useState<string[]>(showTagsInForm ? initialValues?.tags || [] : []);
  const [billable, setBillable] = useState(initialValues?.billable || false);

  const [taskSearch, setTaskSearch] = useState("");

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
        projectId: showProjectsInForm ? selectedProject?.id : undefined,
        workspaceId,
        tags: showTagsInForm ? selectedTags : [],
        taskId: showTasksInForm ? selectedTask?.id : undefined,
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

  const isWorkspacePremium = useMemo(() => {
    return workspaces.find((workspace) => workspace.id === selectedWorkspace)?.premium;
  }, [workspaces, selectedWorkspace]);

  const filteredClients = useMemo(() => {
    if (!showClientsInForm) return [];
    if (selectedProject) return clients.filter((client) => !client.archived && client.id === selectedProject.client_id);
    else
      return clients.filter((client) => !client.archived && (client.wid === selectedWorkspace || !selectedWorkspace));
  }, [projects, selectedWorkspace, selectedProject, showClientsInForm, clients]);

  const filteredProjects = useMemo(() => {
    if (!showProjectsInForm) return [];
    if (selectedClient)
      return projects.filter((project) => project.client_id === selectedClient.id && project.status != "archived");
    else
      return projects.filter(
        (project) => (project.workspace_id === selectedWorkspace || !selectedWorkspace) && project.status != "archived",
      );
  }, [projects, selectedWorkspace, selectedClient, showProjectsInForm]);

  const filteredTasks = useMemo(() => {
    if (!showTasksInForm) return [];
    if (selectedProject) return tasks.filter((task) => task.project_id === selectedProject.id);
    else if (selectedClient)
      return tasks.filter(
        (task) => task.project_id === projects.find((project) => project.client_id === selectedClient.id)?.id,
      );
    else return tasks.filter((task) => task.workspace_id === selectedWorkspace || !selectedWorkspace);
  }, [tasks, selectedWorkspace, selectedClient, selectedProject, showTasksInForm]);

  const onWorkspaceChange = (workspaceId: string) => {
    const workspace = workspaces.find((workspace) => workspace.id === parseInt(workspaceId));
    if (workspace) setSelectedWorkspace(workspace.id);
    if (showClientsInForm) setSelectedClient(undefined);
    if (showProjectsInForm) {
      setSelectedProject(undefined);
      setSelectedTask(undefined);
    }
    if (showTagsInForm) setSelectedTags([]);
  };

  const onProjectChange = (projectId: string) => {
    const project = projects.find((project) => project.id === parseInt(projectId));
    if (project) setSelectedProject(project);
  };

  const onTaskChange = async (taskId: string) => {
    if (taskId == "new_task") {
      const newTaskName = taskSearch;
      setTaskSearch("");
      if (await confirmAlert({ title: "Create new task?", message: "Task name: " + newTaskName })) {
        const toast = await showToast(Toast.Style.Animated, "Creating task...");
        try {
          if (!selectedWorkspace) throw Error("Workspace ID is undefined.");
          if (!selectedProject) throw Error("Workspace ID is undefined.");
          const newTask = await createTask(selectedWorkspace, selectedProject.id, newTaskName);
          revalidateTasks();
          setSelectedTask(newTask);
          toast.style = Toast.Style.Success;
          toast.title = "Created task";
        } catch (error) {
          await toast.hide();
          await showFailureToast(error);
        }
      } else {
        setSelectedTask(undefined);
      }
    } else {
      const task = tasks.find((task) => task.id === parseInt(taskId));
      setSelectedTask(task);
    }
  };

  return (
    <Form
      isLoading={
        isLoadingMe ||
        isLoadingWorkspaces ||
        (showClientsInForm && isLoadingClients) ||
        (showProjectsInForm && isLoadingProjects) ||
        (showTagsInForm && isLoadingTags) ||
        (showTasksInForm && isLoadingTasks)
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
          defaultValue={selectedWorkspace?.toString()}
          onChange={onWorkspaceChange}
        >
          {workspaces.map((workspace) => (
            <Form.Dropdown.Item key={workspace.id} value={workspace.id.toString()} title={workspace.name} />
          ))}
        </Form.Dropdown>
      )}

      <Form.TextField id="description" title="Description" autoFocus defaultValue={initialValues?.description} />

      {showClientsInForm && (
        <Form.Dropdown
          id="client"
          title="Client"
          defaultValue={filteredClients.length > 0 ? selectedClient?.id.toString() || "-1" : undefined}
          onChange={(clientId) =>
            setSelectedClient(
              clientId === "-1" ? undefined : clients.find((client) => client.id === parseInt(clientId)),
            )
          }
        >
          {!isLoadingClients && (
            <>
              <Form.Dropdown.Item key="-1" value="-1" title={"No Client"} />
              {filteredClients.map((client) => (
                <Form.Dropdown.Item key={client.id} value={client.id.toString()} title={client.name} />
              ))}
            </>
          )}
        </Form.Dropdown>
      )}

      {showProjectsInForm && (
        <>
          <Form.Dropdown
            id="project"
            title="Project"
            defaultValue={selectedProject?.id.toString()}
            onChange={onProjectChange}
          >
            {!isLoadingProjects && (
              <>
                <Form.Dropdown.Item key="-1" value="-1" title={"No Project"} icon={Icon.Circle} />
                {filteredProjects.map((project) => (
                  <Form.Dropdown.Item
                    key={project.id}
                    value={project.id.toString()}
                    title={project.name}
                    icon={{ source: Icon.Circle, tintColor: project.color }}
                  />
                ))}
              </>
            )}
          </Form.Dropdown>

          {selectedProject && showTasksInForm && (
            <Form.Dropdown
              id="task"
              title="Task"
              onChange={onTaskChange}
              value={filteredTasks.length > 0 ? selectedTask?.id.toString() ?? "-1" : undefined}
              onSearchTextChange={setTaskSearch}
              onBlur={() => setTaskSearch("")}
            >
              {!isLoadingTasks && (
                <>
                  <Form.Dropdown.Item value="-1" title={"No task"} icon={Icon.Circle} />
                  {filteredTasks.map((task) => (
                    <Form.Dropdown.Item key={task.id} value={task.id.toString()} title={task.name} icon={Icon.Circle} />
                  ))}
                  {taskSearch !== "" && (
                    <Form.Dropdown.Item value="new_task" title={taskSearch} icon={Icon.PlusCircle} />
                  )}
                </>
              )}
            </Form.Dropdown>
          )}

          {selectedProject?.billable && <Form.Checkbox id="billable" label="" title="Billable" />}
        </>
      )}

      {showTagsInForm && (
        <Form.TagPicker id="tags" title="Tags" onChange={setSelectedTags} value={selectedTags}>
          {tags
            .filter((tag) => tag.workspace_id === selectedWorkspace)
            .map((tag) => (
              <Form.TagPicker.Item key={tag.id} value={tag.name.toString()} title={tag.name} />
            ))}
        </Form.TagPicker>
      )}

      {isWorkspacePremium && <Form.Checkbox id="billable" label="Billable" value={billable} onChange={setBillable} />}
    </Form>
  );
}

export default CreateTimeEntryForm;
