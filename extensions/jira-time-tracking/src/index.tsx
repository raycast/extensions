import { useState, useEffect, useRef } from "react";
import { Form, Detail, ActionPanel, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { getIssues, getProjects, postTimeLog } from "./controllers";
import { toSeconds, createTimeLogSuccessMessage } from "./utils";
import { Project, Issue } from "./types";

type UserPreferences = {
  isJiraCloud: boolean;
};

export default function Command() {
  const userPrefs = getPreferenceValues<UserPreferences>();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue>();
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("0");
  const [seconds, setSeconds] = useState("0");
  const [description, setDescription] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>();
  const [startedAt, setStartedAt] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [issueCache, setIssueCache] = useState(new Map());
  const [isJiraCloud] = useState<boolean>(userPrefs.isJiraCloud); // Use user preferences to determine Jira Cloud or Server

  const pageGot = useRef(0);
  const pageTotal = useRef(1);

  async function handleSubmit() {
    const totalTimeWorked = toSeconds(Number(seconds), Number(minutes), Number(hours));

    if (!selectedIssue) {
      showToast(Toast.Style.Failure, "Error logging time: issue not found");
      return;
    }
    if (!totalTimeWorked) {
      showToast(Toast.Style.Failure, "Error logging time: no time entered.");
      return;
    }

    setLoading(true);

    try {
      await postTimeLog(totalTimeWorked, selectedIssue.key, description, startedAt);
      const successMessage = createTimeLogSuccessMessage(selectedIssue.key, hours, minutes, seconds);
      showToast(Toast.Style.Success, successMessage);
      cleanUp();
    } catch (e) {
      showToast(Toast.Style.Failure, e instanceof Error ? e.message : "Error Logging Time");
    } finally {
      setLoading(false);
    }
  }

  // fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const result = await getProjects(pageGot.current);
        if (result.data.length > 0) {
          setProjects((prevProjects) => [...prevProjects, ...result.data]);

          // If Jira Cloud (v3), we expect pagination, so we set pageTotal.current
          // If not (v2), we assume all projects are loaded in one go, hence no pagination
          if (userPrefs.isJiraCloud) {
            pageGot.current += result.data.length;
            pageTotal.current = result.total;
          } else {
            pageGot.current = result.data.length; // All projects are loaded
            pageTotal.current = result.data.length; // Set total to the number of projects loaded
          }

          // Show toast message accordingly
          if (userPrefs.isJiraCloud) {
            showToast(Toast.Style.Animated, `Loading projects ${pageGot.current}/${pageTotal.current}`);
          } else {
            showToast(Toast.Style.Success, "All projects loaded");
          }
        }
      } catch (e) {
        showToast(Toast.Style.Failure, "Failed to load projects", e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    };

    if (projects.length === 0 && (userPrefs.isJiraCloud || pageGot.current < pageTotal.current)) {
      fetchProjects();
    }
  }, [isJiraCloud]); // Re-run the effect if isJiraCloud changes

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
    setHours("0");
    setMinutes("0");
    setSeconds("0");
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
      <Form.DatePicker
        id="startedAt"
        title="Start Date"
        value={startedAt}
        onChange={(date) => {
          date && setStartedAt(date);
        }}
      />
      <Form.Separator />
      <Form.Dropdown id="hours" title="Hours" value={hours} onChange={setHours}>
        {Array(25)
          .fill(null)
          .map((_, i) => (
            <Form.Dropdown.Item title={`${i}`} key={"hours-" + i} value={String(i)} />
          ))}
      </Form.Dropdown>
      <Form.Dropdown id="minutes" title="Minutes" value={minutes} onChange={setMinutes}>
        {Array(60)
          .fill(null)
          .map((_, i) => (
            <Form.Dropdown.Item title={`${i}`} key={"minutes-" + i} value={String(i)} />
          ))}
      </Form.Dropdown>
      <Form.Dropdown id="seconds" title="Seconds" value={seconds} onChange={setSeconds}>
        {Array(60)
          .fill(null)
          .map((_, i) => (
            <Form.Dropdown.Item title={`${i}`} key={"seconds-" + i} value={String(i)} />
          ))}
      </Form.Dropdown>
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
