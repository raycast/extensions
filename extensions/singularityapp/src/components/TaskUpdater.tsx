import { Form, ActionPanel, Action, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import {
  Task,
  Project,
  updateTask,
  getProjects,
  getNote,
  withErrorHandling,
  getApiToken,
  getProjectIcon,
  getAPIDateString,
} from "../api";
import { parseNoteContent } from "../utils/delta-to-markdown";

type TaskUpdaterProps = {
  task: Task;
  projects?: Project[];
  onTaskUpdated?: () => void;
};

export default function TaskUpdater({ task, projects: initialProjects, onTaskUpdated }: TaskUpdaterProps) {
  const { pop } = useNavigation();
  const [title, setTitle] = useState(task.title || "");
  const [note, setNote] = useState("");
  const [priority, setPriority] = useState<string>((task.priority ?? 1).toString());
  const [startDate, setStartDate] = useState<Date | null>(task.start ? new Date(task.start) : null);
  const [deadline, setDeadline] = useState<Date | null>(task.deadline ? new Date(task.deadline) : null);
  const [projectId, setProjectId] = useState<string>(task.projectId || "");
  const [projects, setProjects] = useState<Project[]>(initialProjects || []);
  const [isLoading, setIsLoading] = useState(true);

  // Check if note field looks like an ID (starts with N-T- or similar pattern)
  const isNoteId = task.note && /^N-[A-Z]-[a-f0-9-]+$/i.test(task.note);

  useEffect(() => {
    async function load() {
      const token = await getApiToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      if (!initialProjects) {
        const result = await withErrorHandling(() => getProjects(), "Failed to load projects");
        if (result) setProjects(result);
      }

      // Load and parse note content
      if (isNoteId && task.note) {
        const noteData = await getNote(task.note);
        if (noteData) {
          const content =
            noteData.text || noteData.content || (typeof noteData.delta === "string" ? noteData.delta : null);
          setNote(parseNoteContent(content || ""));
        }
      } else if (task.note) {
        // Parse delta format if it's not an ID
        setNote(parseNoteContent(task.note));
      }

      setIsLoading(false);
    }
    load();
  }, []);

  async function handleSubmit() {
    if (!title.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Title Required", message: "Please enter a task title" });
      return;
    }

    await showToast({ style: Toast.Style.Animated, title: "Updating task" });

    try {
      const params: {
        title: string;
        note?: string;
        priority: 0 | 1 | 2;
        start: string | null;
        deadline: string | null;
        projectId: string | null;
      } = {
        title: title.trim(),
        note: note.trim() || undefined,
        priority: parseInt(priority) as 0 | 1 | 2,
        start: startDate ? getAPIDateString(startDate) : null,
        deadline: deadline ? getAPIDateString(deadline) : null,
        projectId: projectId || null,
      };

      await updateTask(task.id, params);
      await showToast({ style: Toast.Style.Success, title: "Task Updated" });
      onTaskUpdated?.();
      pop();
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Unable to update task" });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" value={title} onChange={setTitle} autoFocus />

      <Form.TextArea id="note" title="Note" value={note} onChange={setNote} />

      <Form.Dropdown id="priority" title="Priority" value={priority} onChange={setPriority}>
        <Form.Dropdown.Item value="0" title="High" />
        <Form.Dropdown.Item value="1" title="Normal" />
        <Form.Dropdown.Item value="2" title="Low" />
      </Form.Dropdown>

      <Form.DatePicker id="start" title="Start Date" value={startDate ?? undefined} onChange={setStartDate} />

      <Form.DatePicker id="deadline" title="Deadline" value={deadline ?? undefined} onChange={setDeadline} />

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
