import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation, confirmAlert } from "@raycast/api";
import { useCachedState, showFailureToast } from "@raycast/utils";
import { useMemo, useState } from "react";

import { Client, Project, Task, TimeEntry, TimeEntryMetaData, updateTimeEntry, createTask } from "@/api";
import { showClientsInForm, showProjectsInForm, showTasksInForm, showTagsInForm } from "@/helpers/preferences";
import { useClients, useMe, useProjects, useTags, useTasks, useWorkspaces } from "@/hooks";

interface UpdateTimeEntryFormProps {
  timeEntry: TimeEntry & TimeEntryMetaData;
  revalidateTimeEntries: () => void;
}

function UpdateTimeEntryForm({ timeEntry, revalidateTimeEntries }: UpdateTimeEntryFormProps) {
  const navigation = useNavigation();
  const { isLoadingMe } = useMe();
  const { workspaces, isLoadingWorkspaces } = useWorkspaces();
  const { clients, isLoadingClients } = showClientsInForm ? useClients() : { clients: [], isLoadingClients: false };
  const { projects, isLoadingProjects } = showProjectsInForm
    ? useProjects()
    : { projects: [], isLoadingProjects: false };
  const { tasks, isLoadingTasks, revalidateTasks } = showTasksInForm
    ? useTasks()
    : { tasks: [], isLoadingTasks: false, revalidateTasks: () => {} };
  const { tags, isLoadingTags } = showTagsInForm ? useTags() : { tags: [], isLoadingTags: false };

  const [selectedWorkspace] = useCachedState("defaultWorkspace", timeEntry.workspace_id);
  const [selectedClient, setSelectedClient] = useState<Client | undefined>(() => {
    return showClientsInForm ? clients.find((client) => client.name === timeEntry.client_name) : undefined;
  });
  const [selectedProject, setSelectedProject] = useState<Project | undefined>(() => {
    return showProjectsInForm ? projects.find((project) => project.id === timeEntry.project_id) : undefined;
  });
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(() => {
    return showTasksInForm ? tasks.find((task) => task.id === timeEntry.task_id) : undefined;
  });
  const [selectedTags, setSelectedTags] = useState<string[]>(showTagsInForm ? timeEntry.tags : []);
  const [billable, setBillable] = useState(timeEntry.billable);

  const [taskSearch, setTaskSearch] = useState("");
  const defaultStartDate = timeEntry.start ? new Date(timeEntry.start) : null;
  const defaultEndDate = timeEntry.stop ? new Date(timeEntry.stop) : null;
  const [startDate, setStartDate] = useState<Date | null>(defaultStartDate);
  const [endDate, setEndDate] = useState<Date | null>(defaultEndDate);

  async function handleSubmit(values: { description: string; billable?: boolean }) {
    try {
      await showToast(Toast.Style.Animated, "Updating time entry...");

      await updateTimeEntry(timeEntry.workspace_id, timeEntry.id, {
        description: values.description,
        billable: values.billable,
        project_id: showProjectsInForm ? selectedProject?.id : undefined,
        task_id: showTasksInForm ? selectedTask?.id : undefined,
        start: startDate?.toISOString(),
        stop: endDate?.toISOString(),
        tags: showTagsInForm ? selectedTags : [],
      });

      await showToast(Toast.Style.Success, "Updated time entry");
      navigation.pop();
      revalidateTimeEntries();
    } catch (e) {
      await showToast(Toast.Style.Failure, "Failed to update time entry");
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
          <Action.SubmitForm title="Update Time Entry" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="description" title="Description" autoFocus defaultValue={timeEntry.description} />

      <Form.DatePicker id="start_date" title="Start Date" defaultValue={defaultStartDate} onChange={setStartDate} />

      <Form.DatePicker id="end_date" title="End Date" defaultValue={defaultEndDate} onChange={setEndDate} />

      <Form.Separator />

      {showClientsInForm && (
        <Form.Dropdown
          id="client"
          title="Client"
          value={filteredClients.length > 0 ? selectedClient?.id.toString() || "-1" : undefined}
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
            value={filteredProjects.length > 0 ? selectedProject?.id.toString() || "-1" : undefined}
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
              value={filteredTasks.length > 0 ? selectedTask?.id.toString() ?? "-1" : undefined}
              onChange={onTaskChange}
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

          {selectedProject?.billable && (
            <Form.Checkbox id="billable" label="" title="Billable" value={billable} onChange={setBillable} />
          )}
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

export default UpdateTimeEntryForm;
