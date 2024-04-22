import { useState, useEffect, useRef } from "react";
import { Form, Detail, ActionPanel, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { getIssues, getProjects, postTimeLog } from "./controllers";
import { parseTimeToSeconds, createTimeLogSuccessMessage } from "./utils";
import { Project, Issue } from "./types";

type UserPreferences = {
  isJiraCloud: string; // "cloud" or "server"
};

export default function Command() {
  const userPrefs = getPreferenceValues<UserPreferences>();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue>();
  const [description, setDescription] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>();
  const [startedAt, setStartedAt] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [issueCache, setIssueCache] = useState(new Map());
  const [totalTimeWorked, setTotalTimeWorked] = useState<number>(0); // Total time in seconds
  const [isJiraCloud, setIsJiraCloud] = useState(userPrefs.isJiraCloud === "cloud"); // Use user preferences to determine Jira Cloud or Server
  const [timeInput, setTimeInput] = useState<string>("");
  const isValidTimeInput = (newTime: string) => /^[0-9hms ]*$/.test(newTime);

  const pageGot = useRef(0);
  const pageTotal = useRef(1);

  const handleTimeInput = (newTime: string) => {
    if (isValidTimeInput(newTime)) {
      setTimeInput(newTime);
      parseTimeInput(newTime);
    }
  };

  const parseTimeInput = (input: string) => {
    const totalSeconds = parseTimeToSeconds(input);

    if (totalSeconds < 900) {
      showToast(Toast.Style.Failure, "Please enter a minimum of 15 minutes.");
      return false;
    }

    setTotalTimeWorked(totalSeconds);
    if (totalSeconds > 0) {
      return true;
    } else {
      showToast(Toast.Style.Failure, "Please enter a valid time.");
    }
    return false;
  };

  async function handleSubmit() {
    if (totalTimeWorked < 900) {
      // 900 seconds = 15 minutes
      showToast(Toast.Style.Failure, "Error logging time: Minimum log time is 15 minutes.");
      return;
    }

    if (totalTimeWorked <= 0) {
      showToast(Toast.Style.Failure, "Error logging time: no time entered.");
      return;
    }

    if (!selectedIssue) {
      showToast(Toast.Style.Failure, "Error logging time: issue not found");
      return;
    }

    setLoading(true);
    try {
      await postTimeLog(totalTimeWorked, selectedIssue.key, description, startedAt);
      const successMessage = createTimeLogSuccessMessage(selectedIssue.key, totalTimeWorked);
      showToast(Toast.Style.Success, successMessage);
      cleanUp();
    } catch (e) {
      showToast(Toast.Style.Failure, e instanceof Error ? e.message : "Error Logging Time");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setIsJiraCloud(userPrefs.isJiraCloud === "cloud");
  }, [userPrefs.isJiraCloud]);

  // fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const result = await getProjects(pageGot.current);
        if (result.data.length > 0) {
          setProjects((prevProjects) => [...prevProjects, ...result.data]);

          if (isJiraCloud) {
            // Use state to check if it is Jira Cloud
            pageGot.current += result.data.length;
            pageTotal.current = result.total;
          } else {
            pageGot.current = result.data.length; // Assume all projects loaded
            pageTotal.current = result.data.length;
          }

          showToast(
            isJiraCloud ? Toast.Style.Animated : Toast.Style.Success,
            `Loading projects ${pageGot.current}/${pageTotal.current}`,
          );
        }
      } catch (e) {
        showToast(Toast.Style.Failure, "Failed to load projects", e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    };

    if (projects.length === 0 || pageGot.current < pageTotal.current) {
      fetchProjects();
    }
  }, [isJiraCloud]);

  // fetch issues after project is selected
  useEffect(() => {
    if (selectedProject) {
      const fetchIssues = async () => {
        setLoading(true);
        try {
          const result = await getIssues(pageGot.current, selectedProject);
          if (result.data.length > 0) {
            setIssueCache((prev) =>
              new Map(prev).set(selectedProject, [...(prev.get(selectedProject) ?? []), ...result.data]),
            );
            setIssues(result.data);
            pageTotal.current = result.total;
            pageGot.current += result.data.length;
            showToast(Toast.Style.Success, "Issues loaded");
          }
        } catch (e) {
          showToast(Toast.Style.Failure, "Failed to load issues", e instanceof Error ? e.message : String(e));
        } finally {
          setLoading(false);
        }
      };
      fetchIssues();
    }
  }, [selectedProject]); // Re-run the effect if selectedProject changes

  const resetIssue = (resetLength: boolean) => {
    const list = issueCache.get(selectedProject) ?? [];
    setIssues(list);
    setSelectedIssue(list.length > 0 ? list[0] : null);
    pageGot.current = list.length;
    if (resetLength) {
      pageTotal.current = Math.max(pageTotal.current, list.length + 1);
    }
  };

  useEffect(() => {
    resetIssue(true);
  }, [selectedProject]);

  useEffect(() => {
    resetIssue(false);
  }, [issueCache]);

  const handleSelectIssue = (issueKey: string) => {
    const issue = issues.find((issue) => issue.key === issueKey);
    setSelectedIssue(issue);
  };

  const cleanUp = () => {
    setDescription("");
    setTimeInput(""); // Reset the time input field
  };

  const emptyMessage = `
# No projects found

No Jira projects were found using your credentials.

This could happen because:

- The provided Jira domain has no associated projects.
- The provided Jira instance is a Jira Server instance, not a Jira Cloud instance.
- The email credential provided is not authorized to access any projects on the provided jira domain.
- The email credential provided is incorrect.
- The API token credential provided is incorrect.

Please check your permissions, jira account, or credentials and try again.
  `;

  if (!projects.length && !loading) {
    return <Detail markdown={emptyMessage} />;
  }

  return (
    <Form
      isLoading={loading}
      navigationTitle="Log Time"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="projectId" title="Project Id" onChange={setSelectedProject}>
        {projects?.map((item) => <Form.Dropdown.Item key={item.key} value={item.key} title={item.name} />)}
      </Form.Dropdown>
      <Form.Dropdown id="issueId" title="Issue Key" defaultValue={selectedIssue?.key} onChange={handleSelectIssue}>
        {issues.map((item) => (
          <Form.Dropdown.Item key={item.key} value={item.key} title={`${item.key}: ${item.fields.summary}`} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.DatePicker
        id="startedAt"
        title="Date"
        value={startedAt}
        onChange={(date) => {
          date && setStartedAt(date);
        }}
      />
      <Form.TextField
        id="timeInput"
        title="Time (e.g., 2h 15m 30s)"
        placeholder="Enter time as 'Xh Ym Zs'"
        value={timeInput}
        onChange={handleTimeInput}
        onBlur={() => parseTimeInput(timeInput)}
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Description of work completed"
        value={description}
        onChange={setDescription}
      />
    </Form>
  );
}
