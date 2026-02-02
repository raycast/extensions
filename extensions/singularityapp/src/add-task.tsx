import { Form, ActionPanel, Action, showToast, Toast, popToRoot, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { createTask, getProjects, Project, withErrorHandling, getApiToken, getProjectIcon } from "./api";
import { NO_TOKEN_MESSAGE } from "./utils/constants";

export default function Command() {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [projectId, setProjectId] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasToken, setHasToken] = useState(true);

  useEffect(() => {
    async function loadData() {
      const token = await getApiToken();
      if (!token) {
        setHasToken(false);
        setIsLoading(false);
        return;
      }

      const result = await withErrorHandling(() => getProjects(), "Failed to load projects");
      if (result) {
        setProjects(result);
      }
      setIsLoading(false);
    }
    loadData();
  }, []);

  async function handleSubmit() {
    if (!title.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Title Required",
        message: "Please enter a task title",
      });
      return;
    }

    const result = await withErrorHandling(
      () =>
        createTask({
          title: title.trim(),
          note: note?.trim() || undefined,
          start: startDate ? startDate.toISOString() : undefined,
          projectId: projectId || undefined,
        }),
      "Failed to create task",
    );

    if (result) {
      await showToast({
        style: Toast.Style.Success,
        title: "Task Created",
        message: `"${title}" has been added`,
      });
      await popToRoot();
    }
  }

  if (!hasToken) {
    return (
      <Form>
        <Form.Description text={`⚠️ API Token not set. ${NO_TOKEN_MESSAGE}`} />
      </Form>
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Enter task title"
        value={title}
        onChange={setTitle}
        autoFocus
      />

      <Form.TextArea
        id="note"
        title="Note"
        placeholder="Optional: Add details or notes"
        value={note ?? ""}
        onChange={setNote}
      />

      <Form.DatePicker id="start" title="Start Date" value={startDate ?? undefined} onChange={setStartDate} />

      {projects.length > 0 && (
        <Form.Dropdown id="project" title="Project" value={projectId} onChange={setProjectId}>
          <Form.Dropdown.Item value="" title="📥  Inbox" />
          {projects.map((project) => (
            <Form.Dropdown.Item
              key={project.id}
              value={project.id}
              title={`${getProjectIcon(project, true).source}  ${project.title}`}
            />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}
