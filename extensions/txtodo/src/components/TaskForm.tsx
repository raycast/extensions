import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useMemo, useState } from "react";
import { parseDueDate } from "../domain/due";
import type { Priority, Task } from "../domain/parser";
import { stripTagsFromDescription } from "../domain/parser";
import { currentPartialTag, matchingTags } from "../domain/tags";
import { taskFromFields } from "../domain/task";

type Mode = "edit" | "new";

type Props = {
  mode: Mode;
  initialTask?: Task;
  knownProjects: string[];
  knownContexts: string[];
  onSubmit: (task: Task) => Promise<void>;
};

type FormValues = {
  description: string;
  priority: string;
  projects: string[];
  contexts: string[];
  due: Date | null;
};

const PRIORITY_OPTIONS: Array<{ value: string; title: string }> = [
  { value: "none", title: "None" },
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((p) => ({ value: p, title: p })),
];

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function TaskForm({ mode, initialTask, knownProjects, knownContexts, onSubmit }: Props) {
  const { pop } = useNavigation();

  const defaults = useMemo(() => {
    if (!initialTask) {
      return {
        description: "",
        priority: "none",
        projects: [] as string[],
        contexts: [] as string[],
        due: null as Date | null,
      };
    }
    return {
      description: stripTagsFromDescription(initialTask.description),
      priority: initialTask.priority ?? "none",
      projects: initialTask.projects,
      contexts: initialTask.contexts,
      due: parseDueDate(initialTask.metadata.due),
    };
  }, [initialTask]);

  const projectOptions = useMemo(
    () => dedupeSorted([...knownProjects, ...defaults.projects]),
    [knownProjects, defaults.projects],
  );
  const contextOptions = useMemo(
    () => dedupeSorted([...knownContexts, ...defaults.contexts]),
    [knownContexts, defaults.contexts],
  );

  const [descriptionValue, setDescriptionValue] = useState(defaults.description);

  const suggestion = useMemo(() => {
    const partial = currentPartialTag(descriptionValue);
    if (!partial) return null;
    const pool = partial.kind === "project" ? projectOptions : contextOptions;
    const matches = matchingTags(partial.partial, pool).slice(0, 6);
    if (matches.length === 0) return null;
    const prefix = partial.kind === "project" ? "+" : "@";
    return matches.map((m) => `${prefix}${m}`).join("  ");
  }, [descriptionValue, projectOptions, contextOptions]);

  async function handleSubmit(values: FormValues) {
    const trimmed = descriptionValue.trim();
    if (trimmed.length === 0) return;
    const task = taskFromFields({
      description: trimmed,
      priority: values.priority === "none" ? undefined : (values.priority as Priority),
      projects: values.projects,
      contexts: values.contexts,
      due: values.due ? formatLocalDate(values.due) : undefined,
      creationDate: initialTask?.creationDate,
      completed: initialTask?.completed ?? false,
      completionDate: initialTask?.completionDate,
    });
    await onSubmit(task);
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={mode === "edit" ? "Save" : "Add Task"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="description"
        title="Description"
        placeholder="Plain text — no need for todo.txt syntax"
        value={descriptionValue}
        onChange={setDescriptionValue}
        autoFocus
      />
      {suggestion && <Form.Description title="Suggestions" text={suggestion} />}
      <Form.Dropdown id="priority" title="Priority" defaultValue={defaults.priority}>
        {PRIORITY_OPTIONS.map((opt) => (
          <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.title} />
        ))}
      </Form.Dropdown>
      <Form.TagPicker id="projects" title="Projects" defaultValue={defaults.projects}>
        {projectOptions.map((p) => (
          <Form.TagPicker.Item key={p} value={p} title={p} />
        ))}
      </Form.TagPicker>
      <Form.TagPicker id="contexts" title="Contexts" defaultValue={defaults.contexts}>
        {contextOptions.map((c) => (
          <Form.TagPicker.Item key={c} value={c} title={c} />
        ))}
      </Form.TagPicker>
      <Form.DatePicker id="due" title="Due Date" defaultValue={defaults.due} type={Form.DatePicker.Type.Date} />
    </Form>
  );
}

function dedupeSorted(arr: string[]): string[] {
  return [...new Set(arr)].sort();
}
