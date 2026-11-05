import { useState, useEffect, useRef } from "react";
import { usePromise } from "@raycast/utils";
import { Form, Detail, ActionPanel, Action, showToast, Toast, getPreferenceValues, useNavigation } from "@raycast/api";
import { getIssue, getIssues, getProjects, postTimeLog, loadAllPages } from "./controllers";
import { parseTimeToSeconds, createTimeLogSuccessMessage } from "./utils";
import { Project, Issue } from "./types";

type LogTimeProps = {
  initialDate?: Date;
  onSuccess?: () => void;
};

const normalizeSearch = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export default function Command({ initialDate, onSuccess }: LogTimeProps) {
  const { pop } = useNavigation();
  const userPrefs = getPreferenceValues<Preferences>();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedIssueKey, setSelectedIssueKey] = useState<string>();
  const [selectedProject, setSelectedProject] = useState<string | undefined>(userPrefs.defaultProject);
  const [description, setDescription] = useState("");
  const [startedAt, setStartedAt] = useState<Date>(() => initialDate ?? new Date());
  const [timeInput, setTimeInput] = useState("");
  const [timeError, setTimeError] = useState<string>();
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [projectError, setProjectError] = useState<string>();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [issueSearch, setIssueSearch] = useState("");
  const [exactIssues, setExactIssues] = useState<Issue[]>([]);
  const exactIssueCache = useRef(new Map<string, Issue>());
  const [debouncedIssueKey, setDebouncedIssueKey] = useState("");
  const availableIssues = Array.from(new Map([...issues, ...exactIssues].map((issue) => [issue.key, issue])).values());
  const searchKey = issueSearch.trim().toUpperCase();
  const cachedIssue = issues.find((issue) => issue.key === searchKey) ?? exactIssueCache.current.get(searchKey);
  const needsLookup = /^[A-Z][A-Z0-9_]*-[0-9]+$/.test(searchKey) && !cachedIssue;
  const lookupReady = needsLookup && debouncedIssueKey === searchKey;
  const { isLoading: requestLoading, error: requestError } = usePromise(
    async (key: string, project: string | undefined) => ({ key, project, issue: await getIssue(key) }),
    [debouncedIssueKey, selectedProject],
    {
      execute: lookupReady,
      onData: ({ key, issue }) => {
        exactIssueCache.current.set(key, issue);
        setExactIssues((current) => [...current.filter((item) => item.key !== issue.key), issue]);
        setSelectedIssueKey(issue.key);
      },
      // The dropdown displays the hook's error inline instead of showing a toast while typing.
      onError: () => {},
    },
  );
  const lookupLoading = needsLookup && (!lookupReady || requestLoading);
  const lookupError = lookupReady && !requestLoading ? requestError?.message : undefined;
  const exactMatchKey = exactIssueCache.current.get(searchKey)?.key ?? searchKey;
  const exactMatch =
    availableIssues.find((issue) => issue.key === exactMatchKey) ??
    (!searchKey ? exactIssues.find((issue) => issue.key === selectedIssueKey) : undefined);
  const searchTerms = normalizeSearch(issueSearch).trim().split(/\s+/).filter(Boolean);
  const matchingIssues = availableIssues.filter((issue) => {
    const text = normalizeSearch(`${issue.key} ${issue.fields.summary}`);
    return searchTerms.every((term) => text.includes(term));
  });
  const visibleIssues = exactMatch
    ? [exactMatch, ...matchingIssues.filter((issue) => issue.key !== exactMatch.key)]
    : matchingIssues;
  const visibleSelection = visibleIssues.some((issue) => issue.key === selectedIssueKey)
    ? selectedIssueKey
    : (visibleIssues[0]?.key ?? "");
  const issueCache = useRef(new Map<string, Issue[]>());
  const loading = projectsLoading || issuesLoading || lookupLoading || submitting;

  const validateTime = () => {
    const valid = parseTimeToSeconds(timeInput) > 0;
    setTimeError(valid ? undefined : "Enter a duration such as 2h 30m or 45m, greater than zero.");
    return valid;
  };

  async function handleSubmit(values: { issueId: string; timeInput: string; description: string; startedAt: Date }) {
    if (submitting || projectsLoading || issuesLoading || lookupLoading || lookupError) return;
    const seconds = parseTimeToSeconds(values.timeInput);
    if (seconds <= 0) {
      validateTime();
      return;
    }
    const issue = visibleIssues.find((item) => item.key === values.issueId);
    if (!issue) {
      await showToast(Toast.Style.Failure, "Choose an issue before logging time.");
      return;
    }
    setSubmitting(true);
    try {
      await postTimeLog(seconds, issue.key, values.description, values.startedAt);
      await showToast(Toast.Style.Success, createTimeLogSuccessMessage(issue.key, seconds));
      setDescription("");
      setTimeInput("");
      if (onSuccess) {
        onSuccess();
        pop();
      }
    } catch (error) {
      await showToast(
        Toast.Style.Failure,
        "Failed to log time",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    let isMounted = true;
    setProjectsLoading(true);
    setProjectError(undefined);
    const load = async () => {
      try {
        const result = await loadAllPages((token) => {
          if (!isMounted) throw new Error("Loading cancelled");
          return getProjects(Number(token || 0));
        });
        if (isMounted) {
          const uniqueProjects = Array.from(new Map(result.map((project) => [project.key, project])).values());
          setProjects(uniqueProjects);
          setSelectedProject((current) =>
            uniqueProjects.some((project) => project.key === current) ? current : uniqueProjects[0]?.key,
          );
        }
      } catch (error) {
        if (isMounted) {
          const message = error instanceof Error ? error.message : String(error);
          setProjectError(message);
          await showToast(Toast.Style.Failure, "Failed to load projects", message);
        }
      } finally {
        if (isMounted) setProjectsLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  useEffect(() => {
    let isMounted = true;
    setIssues([]);
    setSelectedIssueKey(undefined);
    if (!selectedProject) {
      setIssuesLoading(false);
      return;
    }
    const project = selectedProject;
    const cacheKey = JSON.stringify([project, userPrefs.customJQL]);
    const cached = issueCache.current.get(cacheKey);
    if (cached) {
      setIssues(cached);
      setSelectedIssueKey(cached[0]?.key);
      setIssuesLoading(false);
      return;
    }
    setIssuesLoading(true);
    const load = async () => {
      try {
        const result = await loadAllPages((token) => {
          if (!isMounted) throw new Error("Loading cancelled");
          return getIssues(token, project);
        });
        if (isMounted) {
          const uniqueIssues = Array.from(new Map(result.map((issue) => [issue.key, issue])).values());
          issueCache.current.set(cacheKey, uniqueIssues);
          setIssues(uniqueIssues);
          setSelectedIssueKey(uniqueIssues[0]?.key);
        }
      } catch (error) {
        if (isMounted)
          await showToast(
            Toast.Style.Failure,
            "Failed to load issues",
            error instanceof Error ? error.message : String(error),
          );
      } finally {
        if (isMounted) setIssuesLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [selectedProject, userPrefs.customJQL, refreshTrigger]);

  useEffect(() => {
    if (!needsLookup) {
      setDebouncedIssueKey("");
      if (cachedIssue) setSelectedIssueKey(cachedIssue.key);
      return;
    }
    const timer = setTimeout(() => setDebouncedIssueKey(searchKey), 300);
    return () => clearTimeout(timer);
  }, [searchKey, needsLookup, cachedIssue, selectedProject]);

  const handleSelectProject = (project: string) => {
    if (project === selectedProject) return;
    setIssues([]);
    setSelectedIssueKey(undefined);
    setIssueSearch("");
    setExactIssues([]);
    exactIssueCache.current.clear();
    setDebouncedIssueKey("");
    setSelectedProject(project);
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
    return (
      <Detail
        markdown={projectError ? `# Unable to Load Projects\n\n${projectError}` : emptyMessage}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={() => setRefreshTrigger((value) => value + 1)} />
          </ActionPanel>
        }
      />
    );
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
      <Form.Dropdown id="projectId" title="Project" value={selectedProject} onChange={handleSelectProject}>
        {projects?.map((item) => <Form.Dropdown.Item key={item.key} value={item.key} title={item.name} />)}
      </Form.Dropdown>
      <Form.Dropdown
        id="issueId"
        title="Issue"
        value={visibleSelection}
        onChange={setSelectedIssueKey}
        filtering={false}
        isLoading={lookupLoading}
        onSearchTextChange={setIssueSearch}
        error={lookupError}
        info="Search by full issue key (for example APM-12345) to find tickets outside your filter."
      >
        {visibleIssues.map((item) => (
          <Form.Dropdown.Item key={item.key} value={item.key} title={`${item.key}: ${item.fields.summary}`} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.DatePicker
        id="startedAt"
        title="Date"
        value={startedAt}
        onChange={(date) => {
          if (date) setStartedAt(date);
        }}
      />
      <Form.TextField
        id="timeInput"
        title="Time (e.g., 2h 15m 30s)"
        placeholder="Enter time as 'Xh Ym Zs'"
        value={timeInput}
        error={timeError}
        onChange={(value) => {
          setTimeInput(value);
          setTimeError(undefined);
        }}
        onBlur={validateTime}
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
