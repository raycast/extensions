import {
  Form,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  useNavigation,
  openExtensionPreferences,
} from "@raycast/api";
import { useState } from "react";
import { PRIORITIES } from "./types";
import { appendTodo, buildDescription } from "./storage";
import { useValidatedPrefs } from "./preferences";

interface Props {
  /** Called after a todo is successfully added (used when pushed from list) */
  onAdd?: () => void;
  /** Pre-fill text (e.g. from quick-add fallback) */
  initialText?: string;
}

export default function AddTodo({ onAdd, initialText }: Props) {
  const { pop } = useNavigation();
  const { prefs, pathsValid } = useValidatedPrefs();
  const today = new Date().toISOString().split("T")[0];

  const [text, setText] = useState(initialText ?? "");
  const [priority, setPriority] = useState<string>("");
  const [creationDate, setCreationDate] = useState<Date | null>(new Date());
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [projects, setProjects] = useState("");
  const [contexts, setContexts] = useState("");
  const [extraTags, setExtraTags] = useState("");
  const [textError, setTextError] = useState<string | undefined>();

  function validate(): boolean {
    if (!text.trim()) {
      setTextError("Task text is required");
      return false;
    }
    setTextError(undefined);
    return true;
  }

  async function handleSubmit() {
    if (!pathsValid || !validate()) return;

    const parsedProjects = projects
      .split(/[\s,]+/)
      .map((p) => p.replace(/^\+/, "").trim())
      .filter(Boolean);

    const parsedContexts = contexts
      .split(/[\s,]+/)
      .map((c) => c.replace(/^@/, "").trim())
      .filter(Boolean);

    const parsedTags: Record<string, string> = {};
    if (dueDate) {
      parsedTags["due"] = dueDate.toISOString().split("T")[0];
    }
    // Parse extra key:value tags
    const extraWords = extraTags.trim().split(/\s+/).filter(Boolean);
    for (const word of extraWords) {
      const match = word.match(/^([a-zA-Z][a-zA-Z0-9_-]*):([\S]+)$/);
      if (match) parsedTags[match[1]] = match[2];
    }

    const description = buildDescription({
      text: text.trim(),
      projects: parsedProjects,
      contexts: parsedContexts,
      tags: parsedTags,
    });

    // Build raw todo.txt line
    const parts: string[] = [];
    if (priority) parts.push(`(${priority})`);
    if (creationDate) parts.push(creationDate.toISOString().split("T")[0]);
    parts.push(description);
    const line = parts.join(" ");

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding task…",
    });
    try {
      await appendTodo(prefs.todoFilePath, line);
      toast.style = Toast.Style.Success;
      toast.title = "Task added";
      onAdd?.();
      pop();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to add task";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  return (
    <Form
      navigationTitle="Add Todo"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Task"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
          <Action
            title="Open Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="text"
        title="Task"
        placeholder="Buy milk, fix bug, call dentist…"
        value={text}
        onChange={setText}
        error={textError}
        autoFocus
      />

      <Form.Dropdown
        id="priority"
        title="Priority"
        value={priority}
        onChange={setPriority}
      >
        <Form.Dropdown.Item title="None" value="" icon={Icon.Circle} />
        {PRIORITIES.map((p) => (
          <Form.Dropdown.Item
            key={p}
            title={`(${p})`}
            value={p}
            icon={Icon.Circle}
          />
        ))}
      </Form.Dropdown>

      <Form.DatePicker
        id="creationDate"
        title="Creation Date"
        type={Form.DatePicker.Type.Date}
        value={creationDate}
        onChange={setCreationDate}
        info={`Auto-set to today (${today})`}
      />

      <Form.DatePicker
        id="dueDate"
        title="Due Date"
        type={Form.DatePicker.Type.Date}
        value={dueDate}
        onChange={setDueDate}
      />

      <Form.TextField
        id="projects"
        title="Projects"
        placeholder="work, personal (or +work +personal)"
        value={projects}
        onChange={setProjects}
        info="Comma or space separated. Leading + is optional."
      />

      <Form.TextField
        id="contexts"
        title="Contexts"
        placeholder="home, computer (or @home @computer)"
        value={contexts}
        onChange={setContexts}
        info="Comma or space separated. Leading @ is optional."
      />

      <Form.TextField
        id="extraTags"
        title="Extra Tags"
        placeholder="rec:1w t:2024-01-15"
        value={extraTags}
        onChange={setExtraTags}
        info="Additional key:value pairs (e.g. rec:1w for recurrence, t: for threshold date)"
      />

      <Form.Description
        title="Preview"
        text={buildPreview({
          text,
          priority,
          creationDate,
          dueDate,
          projects,
          contexts,
          extraTags,
        })}
      />
    </Form>
  );
}

function buildPreview(opts: {
  text: string;
  priority: string;
  creationDate: Date | null;
  dueDate: Date | null;
  projects: string;
  contexts: string;
  extraTags: string;
}): string {
  const parsedProjects = opts.projects
    .split(/[\s,]+/)
    .map((p) => p.replace(/^\+/, "").trim())
    .filter(Boolean);
  const parsedContexts = opts.contexts
    .split(/[\s,]+/)
    .map((c) => c.replace(/^@/, "").trim())
    .filter(Boolean);
  const parsedTags: Record<string, string> = {};
  if (opts.dueDate)
    parsedTags["due"] = opts.dueDate.toISOString().split("T")[0];
  opts.extraTags
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .forEach((word) => {
      const m = word.match(/^([a-zA-Z][a-zA-Z0-9_-]*):([\S]+)$/);
      if (m) parsedTags[m[1]] = m[2];
    });

  const parts: string[] = [];
  if (opts.priority) parts.push(`(${opts.priority})`);
  if (opts.creationDate)
    parts.push(opts.creationDate.toISOString().split("T")[0]);
  if (opts.text.trim()) {
    parts.push(
      buildDescription({
        text: opts.text.trim(),
        projects: parsedProjects,
        contexts: parsedContexts,
        tags: parsedTags,
      }),
    );
  } else {
    parts.push("(type a task…)");
  }
  return parts.join(" ");
}
