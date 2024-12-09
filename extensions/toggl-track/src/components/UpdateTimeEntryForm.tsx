import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation, confirmAlert } from "@raycast/api";
import { useCachedState, showFailureToast } from "@raycast/utils";
import { useMemo, useState } from "react";

import { Client, Project, Task, TimeEntry, TimeEntryMetaData, updateTimeEntry, createTask } from "@/api";
import { useClients, useMe, useProjects, useTags, useTasks, useWorkspaces } from "@/hooks";

interface UpdateTimeEntryFormProps {
  timeEntry: TimeEntry & TimeEntryMetaData;
  revalidateTimeEntries: () => void;
}

function UpdateTimeEntryForm({ timeEntry, revalidateTimeEntries }: UpdateTimeEntryFormProps) {
  const navigation = useNavigation();
  const { isLoadingMe } = useMe();
  const { workspaces, isLoadingWorkspaces } = useWorkspaces();
  const { clients, isLoadingClients } = useClients();
  const { projects, isLoadingProjects } = useProjects();
  const { tasks, isLoadingTasks, revalidateTasks } = useTasks();
  const { tags, isLoadingTags } = useTags();

  const [selectedWorkspace] = useCachedState("defaultWorkspace", timeEntry.workspace_id);
  const [selectedClient, setSelectedClient] = useState<Client | undefined>(() => {
    return clients.find((client) => client.name === timeEntry.client_name);
  });
  const [selectedProject, setSelectedProject] = useState<Project | undefined>(() => {
    return projects.find((project) => project.id === timeEntry.project_id);
  });
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(() => {
    return tasks.find((task) => task.id === timeEntry.task_id);
  });
  const [selectedTags, setSelectedTags] = useState<string[]>(timeEntry.tags);
  const [billable, setBillable] = useState(timeEntry.billable);

  const [taskSearch, setTaskSearch] = useState("");

  async function handleSubmit(values: { description: string; billable?: boolean }) {
    try {
      await showToast(Toast.Style.Animated, "Updating time entry...");

      await updateTimeEntry(timeEntry.workspace_id, timeEntry.id, {
        description: values.description,
        billable: values.billable,
        project_id: selectedProject?.id,
        task_id: selectedTask?.id,
        tags: selectedTags,
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
    if (selectedProject) return clients.filter((client) => !client.archived && client.id === selectedProject.client_id);
    else
      return clients.filter((client) => !client.archived && (client.wid === selectedWorkspace || !selectedWorkspace));
  }, [projects, selectedWorkspace, selectedProject]);

  const filteredProjects = useMemo(() => {
    if (selectedClient)
      return projects.filter((project) => project.client_id === selectedClient.id && project.status != "archived");
    else
      return projects.filter(
        (project) => (project.workspace_id === selectedWorkspace || !selectedWorkspace) && project.status != "archived",
      );
  }, [projects, selectedWorkspace, selectedClient]);

  const filteredTasks = useMemo(() => {
    if (selectedProject) return tasks.filter((task) => task.project_id === selectedProject.id);
    else if (selectedClient)
      return tasks.filter(
        (task) => task.project_id === projects.find((project) => project.client_id === selectedClient.id)?.id,
      );
    else return tasks.filter((task) => task.workspace_id === selectedWorkspace || !selectedWorkspace);
  }, [tasks, selectedWorkspace, selectedClient, selectedProject]);

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
        isLoadingMe || isLoadingWorkspaces || isLoadingProjects || isLoadingClients || isLoadingTags || isLoadingTasks
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Time Entry" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="description" title="Description" autoFocus defaultValue={timeEntry.description} />

      <Form.Dropdown
        id="client"
        title="Client"
        defaultValue={selectedClient?.id.toString() || "-1"}
        onChange={(clientId) =>
          setSelectedClient(clientId === "-1" ? undefined : clients.find((client) => client.id === parseInt(clientId)))
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

      <Form.Dropdown
        id="project"
        title="Project"
        defaultValue={timeEntry.project_id?.toString() || "-1"}
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

      {selectedProject && (
        <Form.Dropdown
          id="task"
          title="Task"
          defaultValue={timeEntry.task_id?.toString() || "-1"}
          onChange={onTaskChange}
          value={selectedTask?.id.toString() ?? "-1"}
          onSearchTextChange={setTaskSearch}
          onBlur={() => setTaskSearch("")}
        >
          {!isLoadingTasks && (
            <>
              <Form.Dropdown.Item value="-1" title={"No task"} icon={Icon.Circle} />
              {filteredTasks.map((task) => (
                <Form.Dropdown.Item key={task.id} value={task.id.toString()} title={task.name} icon={Icon.Circle} />
              ))}
              {taskSearch !== "" && <Form.Dropdown.Item value="new_task" title={taskSearch} icon={Icon.PlusCircle} />}
            </>
          )}
        </Form.Dropdown>
      )}

      {selectedProject?.billable && <Form.Checkbox id="billable" label="" title="Billable" />}

      <Form.TagPicker id="tags" title="Tags" onChange={setSelectedTags} value={selectedTags}>
        {tags
          .filter((tag) => tag.workspace_id === selectedWorkspace)
          .map((tag) => (
            <Form.TagPicker.Item key={tag.id} value={tag.name.toString()} title={tag.name} />
          ))}
      </Form.TagPicker>

      {isWorkspacePremium && <Form.Checkbox id="billable" label="Billable" value={billable} onChange={setBillable} />}
    </Form>
  );
}

export default UpdateTimeEntryForm;
