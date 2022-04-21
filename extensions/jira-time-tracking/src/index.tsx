import React from "react";
import { Form, ActionPanel, SubmitFormAction, showToast, ToastStyle } from "@raycast/api";
import { getIssues, getProjects, postTimeLog } from "./controllers";
import { toSeconds, createTimeLogSuccessMessage } from "./utils";
import { Project, Issue } from "./types";

export default function Command() {
  const [issues, setIssues] = React.useState<Issue[]>([]);
  const [projects, setProjects] = React.useState<Project[]>();
  const [selectedIssue, setSelectedIssue] = React.useState<Issue>();
  const [hours, setHours] = React.useState("0");
  const [minutes, setMinutes] = React.useState("0");
  const [seconds, setSeconds] = React.useState("0");
  const [description, setDescription] = React.useState("");
  const [selectedProject, setSelectedProject] = React.useState<string>();
  const [startedAt, setStartedAt] = React.useState<Date>(new Date());

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

    try {
      await postTimeLog(totalTimeWorked, selectedIssue.key, description, startedAt);
      const successMessage = createTimeLogSuccessMessage(selectedIssue.key, hours, minutes, seconds);
      showToast(ToastStyle.Success, successMessage);
      cleanUp();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error Logging Time";
      showToast(ToastStyle.Failure, message);
    }
  }

  // fetch projects on mount
  React.useEffect(() => {
    const fetchProjects = async () => {
      const projects = await getProjects();
      if (projects) {
        setProjects(projects);
      }
    };
    fetchProjects();
  }, []);

  // fetch issues after project is selected
  React.useEffect(() => {
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

  return (
    <Form
      isLoading={!projects}
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
