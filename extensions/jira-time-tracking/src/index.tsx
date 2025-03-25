import { useState, useEffect, useRef } from "react";
import { Form, Detail, ActionPanel, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { getIssues, getProjects, postTimeLog } from "./controllers";
import { parseTimeToSeconds, createTimeLogSuccessMessage } from "./utils";
import { Project, Issue } from "./types";

type UserPreferences = {
  isJiraCloud: string; // "cloud" or "server"
  defaultProject?: string;
};

export default function Command() {
  const userPrefs = getPreferenceValues<UserPreferences>();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue>();
  const [description, setDescription] = useState("");
  const [selectedProject, setSelectedProject] = useState<string | undefined>(userPrefs.defaultProject);
  const [startedAt, setStartedAt] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [issueCache, setIssueCache] = useState(new Map());
  const [totalTimeWorked, setTotalTimeWorked] = useState<number>(0); // Total time in seconds
  const [isJiraCloud, setIsJiraCloud] = useState(userPrefs.isJiraCloud === "cloud"); // Use user preferences to determine Jira Cloud or Server
  const [timeInput, setTimeInput] = useState<string>("");
  const isValidTimeInput = (newTime: string) => /^[0-9hms ]*$/.test(newTime);

  const projectsPageGot = useRef(0);
  const projectsPageTotal = useRef(1);

  const issuesPageGot = useRef(0);
  const issuesPageTotal = useRef(1);

  const handleTimeInput = (newTime: string) => {
    if (isValidTimeInput(newTime)) {
      setTimeInput(newTime);
      parseTimeInput(newTime);
    }
  };

  const parseTimeInput = (input: string) => {
    const totalSeconds = parseTimeToSeconds(input);

    setTotalTimeWorked(totalSeconds);
    if (totalSeconds > 0) {
      return true;
    } else {
      showToast(Toast.Style.Failure, "Please enter a valid time (Greater than 0.)");
    }
    return false;
  };

  async function handleSubmit() {
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

  useEffect(() => {
    let isMounted = true;

    const fetchProjects = async () => {
      if (projectsPageGot.current >= projectsPageTotal.current) {
        setLoading(false);
        showToast(Toast.Style.Success, "All projects loaded");
        return;
      }

      setLoading(true);
      try {
        const result = await getProjects(projectsPageGot.current);
        if (result.data.length > 0 && isMounted) {
          setProjects((prevProjects) => {
            const newProjects = [...prevProjects, ...result.data];
            // Ensure unique keys and filter out undefined
            const uniqueProjects = Array.from(new Set(newProjects.map((p) => p.key)))
              .map((key) => newProjects.find((p) => p.key === key))
              .filter((p): p is Project => !!p);
            return uniqueProjects;
          });

          projectsPageGot.current += result.data.length;
          if (isJiraCloud) {
            projectsPageTotal.current = result.total;
          } else {
            projectsPageTotal.current = Math.max(projectsPageTotal.current, projectsPageGot.current + 100);
          }

          showToast(Toast.Style.Animated, `Loading projects ${projectsPageGot.current}/${projectsPageTotal.current}`);
        } else {
          setLoading(false);
          showToast(Toast.Style.Success, `Projects loaded ${projectsPageGot.current}/${projectsPageTotal.current}`);
        }
      } catch (e) {
        if (isMounted) {
          showToast(Toast.Style.Failure, "Failed to load projects", e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      }
    };

    fetchProjects();

    return () => {
      isMounted = false;
    };
  }, [projects.length]);

  useEffect(() => {
    let isMounted = true;

    const fetchIssues = async () => {
      if (!selectedProject || issuesPageGot.current >= issuesPageTotal.current) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const result = await getIssues(issuesPageGot.current, selectedProject);
        if (result.data.length > 0 && isMounted) {
          setIssueCache((prev) => {
            const updatedIssues = [...(prev.get(selectedProject) || []), ...result.data];
            // Ensure unique keys and filter out undefined
            const uniqueIssues = Array.from(new Set(updatedIssues.map((i) => i.key)))
              .map((key) => updatedIssues.find((i) => i.key === key))
              .filter((i): i is Issue => !!i);
            return new Map(prev).set(selectedProject, uniqueIssues);
          });
          setIssues((prevIssues) => {
            const allIssues = [...prevIssues, ...result.data];
            // Ensure unique keys and filter out undefined
            const uniqueIssues = Array.from(new Set(allIssues.map((i) => i.key)))
              .map((key) => allIssues.find((i) => i.key === key))
              .filter((i): i is Issue => !!i);
            return uniqueIssues;
          });

          issuesPageTotal.current = result.total;
          issuesPageGot.current += result.data.length;

          showToast(Toast.Style.Success, `Issues loaded ${issuesPageGot.current}/${issuesPageTotal.current}`);
        } else {
          setLoading(false);
          showToast(Toast.Style.Success, `Issues loaded ${issuesPageGot.current}/${issuesPageTotal.current}`);
        }
      } catch (e) {
        if (isMounted) {
          showToast(Toast.Style.Failure, "Failed to load issues", e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      }
    };

    fetchIssues();

    return () => {
      isMounted = false;
      setLoading(false);
    };
  }, [selectedProject, issues.length]);

  const resetIssue = (resetLength: boolean) => {
    const list = issueCache.get(selectedProject) ?? [];
    setIssues(list);
    setSelectedIssue(list.length > 0 ? list[0] : null);
    issuesPageGot.current = list.length;
    if (resetLength) {
      issuesPageTotal.current = Math.max(issuesPageTotal.current, list.length + 1);
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
    setTotalTimeWorked(0);
  };

  const emptyMessage = `
# No projects found

No Jira projects were found using your credentials.

This could happen because:

-  The provided Jira domain has no associated projects.
-  The provided Jira instance is a Jira Server instance, not a Jira Cloud instance.
-  The email credential provided is not authorized to access any projects on the provided jira domain.
-  The email credential provided is incorrect.
-  The API token credential provided is incorrect.

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
      <Form.Dropdown id="projectId" title="Project Id" value={selectedProject} onChange={setSelectedProject}>
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
