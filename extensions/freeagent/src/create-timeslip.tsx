import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { authorizedWithFreeAgent } from "./oauth";
import { Project, Task, TimeslipFormValues, User } from "./types";
import { fetchProjects, fetchTasks, createTimeslip, getCurrentUser } from "./services/freeagent";
import { useFreeAgent } from "./hooks/useFreeAgent";
import { showFailureToast } from "@raycast/utils";
import { formatDateForAPI } from "./utils/formatting";

const CreateTimeslip = function Command() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { isLoading, isAuthenticated, accessToken, handleError } = useFreeAgent();

  useEffect(() => {
    async function loadData() {
      if (!isAuthenticated || !accessToken) return;

      try {
        // Load both projects and current user
        const [projectList, user] = await Promise.all([
          fetchProjects(accessToken, "active"),
          getCurrentUser(accessToken),
        ]);

        setProjects(projectList);
        setCurrentUser(user);
      } catch (error) {
        handleError(error, "Failed to fetch data");
      }
    }

    loadData();
  }, [isAuthenticated, accessToken]);

  // Load tasks when a project is selected
  useEffect(() => {
    async function loadTasks() {
      if (!isAuthenticated || !accessToken || !selectedProject) {
        setTasks([]);
        return;
      }

      try {
        const taskList = await fetchTasks(accessToken, selectedProject, "active");
        setTasks(taskList);
      } catch (error) {
        handleError(error, "Failed to fetch tasks");
        setTasks([]);
      }
    }

    loadTasks();
  }, [isAuthenticated, accessToken, selectedProject]);

  async function handleSubmit(values: TimeslipFormValues) {
    if (!accessToken) {
      handleError(new Error("No access token available"), "Failed to create timeslip");
      return;
    }

    if (!currentUser) {
      handleError(new Error("User information not available"), "Failed to create timeslip");
      return;
    }

    if (!values.task) {
      handleError(new Error("Please select a task"), "Failed to create timeslip");
      return;
    }

    try {
      const timeslipData = {
        task: values.task,
        user: currentUser.url,
        project: values.project,
        dated_on: values.dated_on ? formatDateForAPI(values.dated_on) : formatDateForAPI(new Date()),
        hours: parseFloat(values.hours) || 0,
        comment: values.comment,
      };

      await createTimeslip(accessToken, timeslipData);

      showToast({
        style: Toast.Style.Success,
        title: "Timeslip created successfully",
      });
    } catch (error) {
      showFailureToast(error, { title: "Failed to create timeslip" });
    }
  }

  if (isLoading) {
    return <Form isLoading={true} />;
  }

  const userDisplayName = currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : "Loading...";
  const formDescription = currentUser
    ? `Create a new timeslip for ${userDisplayName} in FreeAgent`
    : "Create a new timeslip in FreeAgent";

  return (
    <Form
      isLoading={isLoading || !currentUser}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Create Timeslip" />
        </ActionPanel>
      }
    >
      <Form.Description text={formDescription} />

      <Form.Dropdown
        id="project"
        title="Project"
        placeholder="Select a project"
        onChange={(value) => {
          setSelectedProject(value);
          setTasks([]); // Clear tasks when project changes
        }}
      >
        {projects.map((project) => (
          <Form.Dropdown.Item
            key={project.url}
            value={project.url}
            title={`${project.name} - ${project.contact_name}`}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="task"
        title="Task"
        placeholder={selectedProject ? "Select a task" : "Select a project first"}
        info="Choose the specific task for this timeslip. Required field."
      >
        {tasks.map((task) => (
          <Form.Dropdown.Item key={task.url} value={task.url} title={task.name} />
        ))}
      </Form.Dropdown>

      <Form.TextField id="comment" title="Comment" placeholder="Enter additional comments (optional)" />
      <Form.DatePicker id="dated_on" title="Date" />
      <Form.TextField id="hours" title="Hours" placeholder="Enter number of hours (e.g., 2.5)" />
    </Form>
  );
};

export default authorizedWithFreeAgent(CreateTimeslip);
