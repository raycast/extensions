import { Form, ActionPanel, Action, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import type { TodoItem } from "./types";
import { PRIORITIES } from "./types";
import { buildDescription, serializeItem } from "./storage";

interface Props {
  item: TodoItem;
  onSave: (updated: TodoItem) => Promise<void>;
}

export default function EditTodoForm({ item, onSave }: Props) {
  const { pop } = useNavigation();

  const [text, setText] = useState(item.text);
  const [priority, setPriority] = useState<string>(item.priority ?? "");
  const [creationDate, setCreationDate] = useState<Date | null>(
    item.creationDate ? new Date(item.creationDate) : null,
  );
  const [dueDate, setDueDate] = useState<Date | null>(
    item.tags["due"] ? new Date(item.tags["due"]) : null,
  );
  const [projects, setProjects] = useState(item.projects.join(", "));
  const [contexts, setContexts] = useState(item.contexts.join(", "));
  const [extraTags, setExtraTags] = useState<string>(
    Object.entries(item.tags)
      .filter(([k]) => k !== "due")
      .map(([k, v]) => `${k}:${v}`)
      .join(" "),
  );
  const [textError, setTextError] = useState<string | undefined>();

  function validate(): boolean {
    if (!text.trim()) {
      setTextError("Task text is required");
      return false;
    }
    setTextError(undefined);
    return true;
  }

  async function handleSave() {
    if (!validate()) return;

    const parsedProjects = projects
      .split(/[\s,]+/)
      .map((p) => p.replace(/^\+/, "").trim())
      .filter(Boolean);

    const parsedContexts = contexts
      .split(/[\s,]+/)
      .map((c) => c.replace(/^@/, "").trim())
      .filter(Boolean);

    // Parse extra key:value tags
    const parsedTags: Record<string, string> = {};
    if (dueDate) {
      parsedTags["due"] = dueDate.toISOString().split("T")[0];
    }
    const extraWords = extraTags.trim().split(/\s+/);
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

    const updatedItem: TodoItem = {
      ...item,
      text: text.trim(),
      description,
      priority: priority || undefined,
      creationDate: creationDate
        ? creationDate.toISOString().split("T")[0]
        : item.creationDate,
      projects: parsedProjects,
      contexts: parsedContexts,
      tags: parsedTags,
    };
    updatedItem.raw = serializeItem(updatedItem);

    await onSave(updatedItem);
    pop();
  }

  return (
    <Form
      navigationTitle="Edit Task"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Changes"
            icon={Icon.Checkmark}
            onSubmit={handleSave}
          />
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="text"
        title="Task"
        placeholder="Buy milk"
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
    </Form>
  );
}
