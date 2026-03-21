import { Form, ActionPanel, Action, showToast, Toast, popToRoot, Icon } from "@raycast/api";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { useState } from "react";
import { useActiveProject } from "./preferences";

const PRIORITIES = [
  { title: "None", value: "" },
  { title: "High", value: "high" },
  { title: "Medium", value: "medium" },
  { title: "Low", value: "low" },
];

function shellArg(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

export default function Command() {
  const [titleError, setTitleError] = useState<string | undefined>();
  const [activeProject, setActiveProject, config] = useActiveProject();

  // Dynamic list fields
  const [acItems, setAcItems] = useState<string[]>([""]);
  const [dodItems, setDodItems] = useState<string[]>([]);
  const [refItems, setRefItems] = useState<string[]>([""]);
  const [docItems, setDocItems] = useState<string[]>([""]);

  function handleSubmit(values: Record<string, unknown>) {
    const title = (values.title as string).trim();
    if (!title) {
      setTitleError("Title is required");
      return;
    }

    const args: string[] = ["task", "create", shellArg(title)];

    const description = (values.description as string)?.trim();
    if (description) {
      args.push("--description", shellArg(description));
    }

    const priority = values.priority as string;
    if (priority) {
      args.push("--priority", priority);
    }

    const labels = (values.labels as string)?.trim();
    if (labels) {
      const cleaned = labels
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean)
        .join(",");
      if (cleaned) args.push("--labels", shellArg(cleaned));
    }

    const assignee = (values.assignee as string)?.trim();
    if (assignee) {
      args.push("--assignee", shellArg(assignee));
    }

    if (values.isDraft) {
      args.push("--draft");
    }

    // Parent task
    const parent = (values.parent as string)?.trim();
    if (parent) {
      args.push("--parent", shellArg(parent));
    }

    // Dependencies
    const dependsOn = (values.dependsOn as string)?.trim();
    if (dependsOn) {
      args.push("--depends-on", shellArg(dependsOn));
    }

    // Notes
    const notes = (values.notes as string)?.trim();
    if (notes) {
      args.push("--notes", shellArg(notes));
    }

    // Acceptance criteria (multiple --ac flags)
    for (const item of acItems) {
      const val = (values[`ac-${acItems.indexOf(item)}`] as string)?.trim();
      if (val) args.push("--ac", shellArg(val));
    }

    // Definition of Done (multiple --dod flags)
    if (values.noDodDefaults) {
      args.push("--no-dod-defaults");
    }
    for (const item of dodItems) {
      const val = (values[`dod-${dodItems.indexOf(item)}`] as string)?.trim();
      if (val) args.push("--dod", shellArg(val));
    }

    // References (multiple --ref flags) - from text fields
    for (let i = 0; i < refItems.length; i++) {
      const val = (values[`ref-${i}`] as string)?.trim();
      if (val) args.push("--ref", shellArg(val));
    }

    // Docs (multiple --doc flags)
    for (let i = 0; i < docItems.length; i++) {
      const val = (values[`doc-${i}`] as string)?.trim();
      if (val) args.push("--doc", shellArg(val));
    }

    // File attachments via FilePicker → --ref
    const attachments = ((values.attachments as string[]) || []).filter((f) => existsSync(f));
    for (const file of attachments) {
      args.push("--ref", shellArg(file));
    }

    args.push("--plain");

    const cmd = `${config.backlogPath} ${args.join(" ")}`;

    try {
      showToast({ style: Toast.Style.Animated, title: "Creating task..." });

      const output = execSync(cmd, {
        cwd: activeProject,
        encoding: "utf-8",
        timeout: 15000,
        shell: "/bin/zsh",
        env: { ...process.env, FORCE_COLOR: "0" },
      });

      const idMatch = output.match(/(?:task|TASK)[-\s]?(\S+)/i);
      const taskId = idMatch ? idMatch[1] : undefined;

      showToast({
        style: Toast.Style.Success,
        title: "Task created",
        message: taskId ? `Task ${taskId}` : undefined,
      });

      popToRoot();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create task",
        message: message.split("\n")[0],
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} />
          <ActionPanel.Section title="Add Fields">
            <Action
              title="Add Acceptance Criterion"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "a" }}
              onAction={() => setAcItems([...acItems, ""])}
            />
            <Action
              title="Add Definition of Done Item"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={() => setDodItems([...dodItems, ""])}
            />
            <Action
              title="Add Reference"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => setRefItems([...refItems, ""])}
            />
            <Action
              title="Add Documentation Link"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              onAction={() => setDocItems([...docItems, ""])}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Remove Fields">
            <Action
              title="Remove Last Acceptance Criterion"
              icon={Icon.Minus}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              onAction={() => acItems.length > 0 && setAcItems(acItems.slice(0, -1))}
            />
            <Action
              title="Remove Last Definition of Done"
              icon={Icon.Minus}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["opt", "shift"], key: "d" }}
              onAction={() => dodItems.length > 0 && setDodItems(dodItems.slice(0, -1))}
            />
            <Action
              title="Remove Last Reference"
              icon={Icon.Minus}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={() => refItems.length > 1 && setRefItems(refItems.slice(0, -1))}
            />
            <Action
              title="Remove Last Documentation Link"
              icon={Icon.Minus}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["opt"], key: "d" }}
              onAction={() => docItems.length > 1 && setDocItems(docItems.slice(0, -1))}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {/* ── Project ── */}
      {config.projects.length > 1 && (
        <Form.Dropdown id="project" title="Project" value={activeProject} onChange={setActiveProject}>
          {config.projects.map((p) => (
            <Form.Dropdown.Item key={p.path} title={p.name} value={p.path} />
          ))}
        </Form.Dropdown>
      )}

      {/* ── Core ── */}
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Task title"
        error={titleError}
        onChange={() => titleError && setTitleError(undefined)}
        autoFocus
      />
      <Form.TextArea id="description" title="Description" placeholder="Describe the task..." />

      <Form.Separator />

      {/* ── Metadata ── */}
      <Form.Dropdown id="priority" title="Priority" defaultValue="">
        {PRIORITIES.map((p) => (
          <Form.Dropdown.Item key={p.value} title={p.title} value={p.value} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="labels" title="Labels" placeholder="bug, frontend (comma-separated)" />
      <Form.TextField id="assignee" title="Assignee" placeholder="Assignee name" />
      <Form.Checkbox id="isDraft" title="Draft" label="Create as draft" defaultValue={false} />

      <Form.Separator />

      {/* ── Relationships ── */}
      <Form.TextField id="parent" title="Parent Task" placeholder="e.g. task-42" info="Parent task ID" />
      <Form.TextField
        id="dependsOn"
        title="Depends On"
        placeholder="task-1, task-2"
        info="Comma-separated task IDs this task depends on"
      />

      <Form.Separator />

      {/* ── Acceptance Criteria (dynamic) ── */}
      <Form.Description text="Acceptance Criteria  ⌘A to add" />
      {acItems.map((_, i) => (
        <Form.TextField key={`ac-${i}`} id={`ac-${i}`} title={`AC ${i + 1}`} placeholder="Criterion..." />
      ))}

      {/* ── Definition of Done (dynamic) ── */}
      <Form.Description text="Definition of Done  ⌘D to add" />
      <Form.Checkbox id="noDodDefaults" title="" label="Skip default DoD items" defaultValue={false} />
      {dodItems.map((_, i) => (
        <Form.TextField key={`dod-${i}`} id={`dod-${i}`} title={`DoD ${i + 1}`} placeholder="Done criterion..." />
      ))}

      <Form.Separator />

      {/* ── Notes ── */}
      <Form.TextArea id="notes" title="Notes" placeholder="Implementation notes..." />

      <Form.Separator />

      {/* ── References (dynamic) ── */}
      <Form.Description text="References  ⌘R to add" />
      {refItems.map((_, i) => (
        <Form.TextField key={`ref-${i}`} id={`ref-${i}`} title={`Ref ${i + 1}`} placeholder="URL or file path" />
      ))}

      {/* ── Documentation (dynamic) ── */}
      <Form.Description text="Documentation  ⇧⌘D to add" />
      {docItems.map((_, i) => (
        <Form.TextField key={`doc-${i}`} id={`doc-${i}`} title={`Doc ${i + 1}`} placeholder="URL or file path" />
      ))}

      <Form.Separator />

      {/* ── File Attachments ── */}
      <Form.FilePicker
        id="attachments"
        title="Attachments"
        allowMultipleSelection
        canChooseDirectories={false}
        info="Drag and drop screenshots or files — added as --ref"
      />
    </Form>
  );
}
