import { useState, useEffect } from "react";
import { Form, Detail, ActionPanel, SubmitFormAction, showToast, ToastStyle } from "@raycast/api";
import { getIssues, getProjects, postTimeLog } from "./controllers";
import { toSeconds, createTimeLogSuccessMessage } from "./utils";
import { Project, Issue } from "./types";

export default function Command() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [projects, setProjects] = useState<Project[]>();
  const [selectedIssue, setSelectedIssue] = useState<Issue>();
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("0");
  const [seconds, setSeconds] = useState("0");
  const [description, setDescription] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>();
  const [startedAt, setStartedAt] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  async function handleSubmit() {
    const totalTimeWorked = toSeconds(Number(seconds), Number(minutes), Number(hours));

    if (!selectedIssue) {
      showToast(ToastStyle.Failure, "Error logging time: issue not found");
      return;
    }
    if (!totalTimeWorked) {
      showToast(ToastStyle.Failure, "Error logging time: no time entered.");
      return;
    }

    setLoading(true);

    try {
      await postTimeLog(totalTimeWorked, selectedIssue.key, description, startedAt);
      const successMessage = createTimeLogSuccessMessage(selectedIssue.key, hours, minutes, seconds);
      showToast(ToastStyle.Success, successMessage);
      cleanUp();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error Logging Time";
      showToast(ToastStyle.Failure, message);
    } finally {
      setLoading(false);
    }
  }

  // fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projects = await getProjects();
        if (projects.length) {
          setProjects(projects);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : "Error Logging Time";
        showToast(ToastStyle.Failure, message);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // fetch issues after project is selected
  useEffect(() => {
    if (selectedProject) {
      const fetchIssues = async () => {
        const issues = await getIssues(selectedProject);
        if (issues) {
          setIssues(issues);
          setSelectedIssue(issues.at(-1));
        }
      };
      fetchIssues();
    }
  }, [selectedProject]);

  const handleSelectIssue = (key: string) => {
    const issue = issues.find((issue) => issue.key === key);
    if (issue) setSelectedIssue(issue);
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

- The provided jira domain has no associated projects.
- The email credential provided is not authorized to access any projects on the provided jira domain.
- The email credential provided is incorrect.
- The API token credential provided is incorrect.

Please check your permissions, jira account or credentials and try again.
  `;

  if (!projects && !loading) {
    return <Detail markdown={emptyMessage} />;
  }

  return (
    <Form
      isLoading={loading}
      navigationTitle="Log Time"
      actions={
        <ActionPanel>
          <SubmitFormAction onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="projectId" title="Project Id" onChange={setSelectedProject}>
        {projects?.map((item) => (
          <Form.DropdownItem key={item.key} value={item.key} title={item.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="issueId" title="Issue Key" defaultValue={selectedIssue?.key} onChange={handleSelectIssue}>
        {issues.map((item) => (
          <Form.DropdownItem key={item.key} value={item.key} title={`${item.key}: ${item.fields.summary}`} />
        ))}
      </Form.Dropdown>
      <Form.DatePicker id="startedAt" title="Start Date" value={startedAt} onChange={setStartedAt} />
      <Form.Separator />
      <Form.Dropdown id="hours" title="Hours" value={hours} onChange={setHours}>
        {Array(25)
          .fill(null)
          .map((_, i) => (
            <Form.DropdownItem title={`${i}`} key={"hours-" + i} value={String(i)} />
          ))}
      </Form.Dropdown>
      <Form.Dropdown id="minutes" title="Minutes" value={minutes} onChange={setMinutes}>
        {Array(60)
          .fill(null)
          .map((_, i) => (
            <Form.DropdownItem title={`${i}`} key={"minutes-" + i} value={String(i)} />
          ))}
      </Form.Dropdown>
      <Form.Dropdown id="seconds" title="Seconds" value={seconds} onChange={setSeconds}>
        {Array(60)
          .fill(null)
          .map((_, i) => (
            <Form.DropdownItem title={`${i}`} key={"seconds-" + i} value={String(i)} />
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
