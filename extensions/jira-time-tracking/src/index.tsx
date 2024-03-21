import { useState, useEffect, useRef } from "react";
import { Form, Detail, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { getIssues, getProjects, postTimeLog } from "./controllers";
import { toSeconds, createTimeLogSuccessMessage } from "./utils";
import { Project, Issue } from "./types";

export default function Command() {
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
      const message = e instanceof Error ? e.message : "Error Logging Time";
      showToast(Toast.Style.Failure, message);
    } finally {
      setLoading(false);
    }
  }

  // fetch projects on mount
  useEffect(() => {
    if (!selectedProject) {
      if (pageGot.current < pageTotal.current) {
        const fetchProjects = async () => {
          console.debug("fetch project");
          try {
            const result = await getProjects(pageGot.current);
            pageTotal.current = result.total;
            pageGot.current = pageGot.current + result.data.length;
            if (result.data.length > 0) {
              setProjects([...projects, ...result.data]);
            }
            showToast(Toast.Style.Animated, `Loading projects ${pageGot.current}/${pageTotal.current}`);
          } catch (e) {
            const message = e instanceof Error ? e.message : "Error Logging Time";
            showToast(Toast.Style.Failure, message);
          } finally {
            setLoading(false);
          }
        };
        fetchProjects();
      } else {
        showToast(Toast.Style.Success, `Project loaded ${pageGot.current}/${pageTotal.current}`);
      }
    }
  }, [projects]);

  // fetch issues after project is selected
  useEffect(() => {
    if (selectedProject) {
      if (pageGot.current < pageTotal.current) {
        const fetchIssues = async (project: string) => {
          const result = await getIssues(pageGot.current, project);
          const oldIssues = issueCache.get(project) ?? [];
          setIssueCache((prev) => new Map(prev).set(project, [...oldIssues, ...result.data]));
          pageTotal.current = result.total;
          showToast(Toast.Style.Animated, `Loading issues ${pageGot.current}/${pageTotal.current}`);
        };
        fetchIssues(selectedProject);
      } else {
        showToast(Toast.Style.Success, `Issue loaded ${pageGot.current}/${pageTotal.current}`);
      }
    }
  }, [issues]);

  const resetIssue = (resetLength: boolean) => {
    const list = issueCache.get(selectedProject) ?? [];
    setIssues([...list]);
    setSelectedIssue(list[0]);
    pageGot.current = list.length;
    if (resetLength) {
      pageTotal.current = list.length + 1;
    }
  };

  useEffect(() => {
    resetIssue(true);
  }, [selectedProject]);

  useEffect(() => {
    resetIssue(false);
  }, [issueCache]);

  const handleSelectIssue = (key: string) => {
    const issue = issues.find((issue) => issue.key === key);
    if (issue) {
      setSelectedIssue(issue);
    }
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
