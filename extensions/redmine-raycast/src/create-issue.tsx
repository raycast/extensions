import { Form, ActionPanel, Action, showToast, Toast, Icon, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";
import {
  fetchProjects,
  fetchProjectTrackers,
  fetchProjectStatuses,
  fetchProjectPriorities,
  createIssue,
  RedmineProject,
  RedmineTracker,
  RedmineStatus,
  RedminePriority,
} from "./redmine";

export default function Command() {
  const [projects, setProjects] = useState<RedmineProject[]>([]);
  const [trackers, setTrackers] = useState<RedmineTracker[]>([]);
  const [statuses, setStatuses] = useState<RedmineStatus[]>([]);
  const [priorities, setPriorities] = useState<RedminePriority[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedTracker, setSelectedTracker] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingTrackers, setIsLoadingTrackers] = useState(false);
  const [isLoadingStatuses, setIsLoadingStatuses] = useState(false);
  const [isLoadingPriorities, setIsLoadingPriorities] = useState(false);

  // Initial load: Fetch projects only
  useEffect(() => {
    async function loadProjects() {
      try {
        const projectsData = await fetchProjects();
        setProjects(projectsData);

        // Set default project if available
        if (projectsData.length > 0) {
          setSelectedProject(projectsData[0].id.toString());
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load projects";
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: errorMessage,
        });
      } finally {
        setIsLoadingProjects(false);
      }
    }
    loadProjects();
  }, []);

  // When project is selected, load trackers for that project
  useEffect(() => {
    if (!selectedProject) {
      setTrackers([]);
      setSelectedTracker("");
      return;
    }

    async function loadTrackers() {
      setIsLoadingTrackers(true);
      try {
        const projectId = parseInt(selectedProject, 10);
        const trackersData = await fetchProjectTrackers(projectId);
        setTrackers(trackersData);

        // Reset dependent fields
        setSelectedTracker("");
        setStatuses([]);
        setPriorities([]);
        setSelectedStatus("");
        setSelectedPriority("");

        // Set default tracker if available
        if (trackersData.length > 0) {
          setSelectedTracker(trackersData[0].id.toString());
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "No trackers",
            message: "This project has no available trackers",
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load trackers";
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: errorMessage,
        });
        setTrackers([]);
        setSelectedTracker("");
      } finally {
        setIsLoadingTrackers(false);
      }
    }

    loadTrackers();
  }, [selectedProject]);

  // When tracker is selected, load statuses and priorities
  useEffect(() => {
    if (!selectedProject || !selectedTracker) {
      setStatuses([]);
      setPriorities([]);
      setSelectedStatus("");
      setSelectedPriority("");
      return;
    }

    async function loadStatusesAndPriorities() {
      setIsLoadingStatuses(true);
      setIsLoadingPriorities(true);
      try {
        const projectId = parseInt(selectedProject, 10);
        const trackerId = parseInt(selectedTracker, 10);

        const [statusesData, prioritiesData] = await Promise.all([
          fetchProjectStatuses(projectId, trackerId),
          fetchProjectPriorities(projectId, trackerId),
        ]);

        setStatuses(statusesData);
        setPriorities(prioritiesData);

        // Reset selections
        setSelectedStatus("");
        setSelectedPriority("");

        // Set defaults if available
        if (statusesData.length > 0) {
          setSelectedStatus(statusesData[0].id.toString());
        }
        if (prioritiesData.length > 0) {
          setSelectedPriority(prioritiesData[0].id.toString());
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load statuses and priorities";
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: errorMessage,
        });
        setStatuses([]);
        setPriorities([]);
        setSelectedStatus("");
        setSelectedPriority("");
      } finally {
        setIsLoadingStatuses(false);
        setIsLoadingPriorities(false);
      }
    }

    loadStatusesAndPriorities();
  }, [selectedProject, selectedTracker]);

  async function handleSubmit() {
    if (!selectedProject) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Project required",
        message: "Please select a project",
      });
      return;
    }

    if (!selectedTracker) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Tracker required",
        message: "Please select a tracker",
      });
      return;
    }

    if (!subject.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Subject required",
        message: "Please enter a subject",
      });
      return;
    }

    if (!selectedStatus) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Status required",
        message: "Please select a status",
      });
      return;
    }

    if (!selectedPriority) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Priority required",
        message: "Please select a priority",
      });
      return;
    }

    try {
      const issue = await createIssue({
        projectId: parseInt(selectedProject, 10),
        trackerId: parseInt(selectedTracker, 10),
        subject: subject.trim(),
        statusId: parseInt(selectedStatus, 10),
        priorityId: parseInt(selectedPriority, 10),
        description: description.trim() || undefined,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Issue created",
        message: `Issue #${issue.id} created successfully`,
      });

      popToRoot();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create issue";
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: errorMessage,
      });
    }
  }

  const isLoading = isLoadingProjects || isLoadingTrackers || isLoadingStatuses || isLoadingPriorities;
  const isTrackerDisabled = !selectedProject || isLoadingTrackers;
  const isStatusDisabled = !selectedTracker || isLoadingStatuses;
  const isPriorityDisabled = !selectedTracker || isLoadingPriorities;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Issue" onSubmit={handleSubmit} icon={Icon.Plus} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Create Issue for Myself"
        text="Select a project first, then tracker, status, and priority. Each selection loads options for the next step."
      />

      <Form.Dropdown
        id="project"
        title="Project"
        value={selectedProject}
        onChange={setSelectedProject}
        info="Select the project for this issue"
        isLoading={isLoadingProjects}
      >
        {projects.map((project) => (
          <Form.Dropdown.Item key={project.id} title={project.name} value={project.id.toString()} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="tracker"
        title="Tracker"
        value={selectedTracker}
        onChange={setSelectedTracker}
        info={isTrackerDisabled ? "Select a project first" : "Select the tracker type (e.g., Bug, Feature, User Story)"}
        isLoading={isLoadingTrackers}
        isDisabled={isTrackerDisabled}
      >
        {trackers.map((tracker) => (
          <Form.Dropdown.Item key={tracker.id} title={tracker.name} value={tracker.id.toString()} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="status"
        title="Status"
        value={selectedStatus}
        onChange={setSelectedStatus}
        info={isStatusDisabled ? "Select a tracker first" : "Select the initial status for this issue"}
        isLoading={isLoadingStatuses}
        isDisabled={isStatusDisabled}
      >
        {statuses.map((status) => (
          <Form.Dropdown.Item key={status.id} title={status.name} value={status.id.toString()} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="priority"
        title="Priority"
        value={selectedPriority}
        onChange={setSelectedPriority}
        info={isPriorityDisabled ? "Select a tracker first" : "Select the priority level for this issue"}
        isLoading={isLoadingPriorities}
        isDisabled={isPriorityDisabled}
      >
        {priorities.map((priority) => (
          <Form.Dropdown.Item key={priority.id} title={priority.name} value={priority.id.toString()} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="subject"
        title="Subject"
        placeholder="Enter issue subject"
        value={subject}
        onChange={setSubject}
        info="Enter a brief description of the issue"
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional detailed description of the issue"
        value={description}
        onChange={setDescription}
        info="Provide additional details about the issue (optional)"
      />
    </Form>
  );
}
