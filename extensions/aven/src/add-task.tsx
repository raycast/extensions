import { useMemo, useRef, useState } from "react";
import { promisify } from "node:util";
import { execFile as execFileCallback } from "node:child_process";
import { Form, ActionPanel, Action, showToast, Toast, popToRoot, getPreferenceValues } from "@raycast/api";
import { showFailureToast, useExec } from "@raycast/utils";
import { buildAddTaskArgs, parseWorkspaces, resolveSelection, validateTaskForm, type Project } from "./lib";

const execFile = promisify(execFileCallback);

const AVEN_PATH = `${process.env.HOME}/.cargo/bin:/opt/homebrew/bin:/usr/local/bin:${process.env.PATH ?? ""}`;
const AVEN_ENV = { ...process.env, PATH: AVEN_PATH };

const STATUSES = [
  { value: "inbox", title: "Inbox" },
  { value: "backlog", title: "Backlog" },
  { value: "todo", title: "Todo" },
  { value: "active", title: "Active" },
  { value: "done", title: "Done" },
  { value: "canceled", title: "Canceled" },
];

export default function Command() {
  const preferences = getPreferenceValues<Preferences.AddTask>();

  const [chosenWorkspace, setChosenWorkspace] = useState<string>("");
  const [chosenProject, setChosenProject] = useState<string>("");
  const [status, setStatus] = useState<string>("inbox");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitInFlight = useRef(false);

  const {
    data: workspacesOutput,
    isLoading: isLoadingWorkspaces,
    error: workspacesError,
  } = useExec("aven", ["workspace", "list"], {
    env: AVEN_ENV,
  });

  const workspaces = useMemo(() => (workspacesOutput ? parseWorkspaces(workspacesOutput) : []), [workspacesOutput]);

  const workspaceKey = resolveSelection(workspaces, chosenWorkspace, preferences.defaultWorkspace);

  const {
    data: projectsOutput,
    isLoading: isLoadingProjects,
    error: projectsError,
  } = useExec("aven", ["project", "list", "--json", "--workspace", workspaceKey], {
    env: AVEN_ENV,
    execute: workspaceKey !== "",
  });

  const projects = useMemo<Project[]>(() => {
    if (!projectsOutput) return [];
    try {
      return JSON.parse(projectsOutput) as Project[];
    } catch {
      return [];
    }
  }, [projectsOutput]);

  const projectKey = resolveSelection(projects, chosenProject, preferences.defaultProject);

  const listError = workspacesError ?? projectsError;

  function handleWorkspaceChange(key: string) {
    setChosenWorkspace(key);
    setChosenProject("");
  }

  async function handleSubmit() {
    if (submitInFlight.current) return;

    if (listError) {
      await showFailureToast(listError, { title: "Failed to load from aven" });
      return;
    }

    const validationError = validateTaskForm({ title, workspaceKey, projectKey });
    if (validationError) {
      await showToast({ style: Toast.Style.Failure, title: validationError });
      return;
    }

    submitInFlight.current = true;
    setIsSubmitting(true);
    try {
      const args = buildAddTaskArgs({ title, workspaceKey, projectKey, status, description });
      await execFile("aven", args, { env: AVEN_ENV });
      await showToast({ style: Toast.Style.Success, title: "Task created" });
      await popToRoot();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to create task" });
    } finally {
      setIsSubmitting(false);
      submitInFlight.current = false;
    }
  }

  const isInitialLoad =
    !listError && (workspacesOutput === undefined || (workspaces.length > 0 && projectsOutput === undefined));

  if (isInitialLoad) return <Form isLoading />;

  return (
    <Form
      isLoading={isLoadingWorkspaces || isLoadingProjects || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {listError && <Form.Description title="Error" text={listError.message} />}
      <Form.Dropdown id="workspace" title="Workspace" value={workspaceKey} onChange={handleWorkspaceChange}>
        {workspaces.map((workspace) => (
          <Form.Dropdown.Item key={workspace.key} value={workspace.key} title={workspace.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="project" title="Project" value={projectKey} onChange={setChosenProject}>
        {projects.map((project) => (
          <Form.Dropdown.Item key={project.key} value={project.key} title={project.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="status" title="Status" value={status} onChange={setStatus}>
        {STATUSES.map((item) => (
          <Form.Dropdown.Item key={item.value} value={item.value} title={item.title} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="title" title="Title" placeholder="Task title" value={title} onChange={setTitle} />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Markdown description (optional)"
        value={description}
        onChange={setDescription}
      />
    </Form>
  );
}
