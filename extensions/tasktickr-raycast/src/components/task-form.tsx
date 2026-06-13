import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import {
  PRIORITIES as PRIORITY_VALUES,
  RECURRENCE_KINDS,
  recurrenceLabel,
} from "@shared/task-core";
import { ApiError, api } from "../lib/api";
import { refreshMenuBar } from "../lib/refresh";
import type { Priority, Recurrence, Task, Workspace } from "../lib/types";

const titleCase = (s: string) => s[0] + s.slice(1).toLowerCase();
const PRIORITIES: { value: Priority; title: string }[] = PRIORITY_VALUES.map(
  (p) => ({ value: p, title: titleCase(p) }),
);

interface FormValues {
  title: string;
  note: string;
  dueDate: Date | null;
  priority: string;
  workspaceId: string;
  recurrence: string;
  recurrenceDays?: string;
  duration: string;
  notifyOnDue: string;
}

interface ParsedTask {
  title: string;
  note: string | null;
  dueDate: string | null;
  priority: Priority | null;
}

interface TaskFormProps {
  /** Existing task to edit; omit to create a new one. */
  task?: Task;
  /** Parent task when creating a subtask. */
  parentId?: string;
  workspaces: Workspace[];
  defaultWorkspaceId?: string;
  onSaved: () => void;
}

export function TaskForm({
  task,
  parentId,
  workspaces,
  defaultWorkspaceId,
  onSaved,
}: TaskFormProps) {
  const { pop } = useNavigation();
  const [titleError, setTitleError] = useState<string | undefined>();
  const [recurrenceDaysError, setRecurrenceDaysError] = useState<
    string | undefined
  >();
  const [recurrence, setRecurrence] = useState<string>(task?.recurrence ?? "");
  const [durationError, setDurationError] = useState<string | undefined>();

  function parseRecurrenceFields(values: FormValues): {
    recurrence: Recurrence | null;
    recurrenceDays: number | undefined;
  } | null {
    const rec = (values.recurrence || null) as Recurrence | null;
    let recurrenceDays: number | undefined;
    if (rec === "EVERY_N_DAYS") {
      recurrenceDays = Number(values.recurrenceDays);
      if (!Number.isInteger(recurrenceDays) || recurrenceDays < 1) {
        setRecurrenceDaysError("Must be a whole number ≥ 1");
        return null;
      }
    }
    return { recurrence: rec, recurrenceDays };
  }

  // "30", "30m", "45 min" → minutes; "2h", "1.5h", "2 hours" → hours.
  // Returns null for empty (clear), undefined on invalid input (error set).
  function parseDuration(values: FormValues): number | null | undefined {
    const raw = values.duration.trim().toLowerCase();
    if (!raw) return null;
    const match = raw.match(
      /^(\d+(?:[.,]\d+)?)\s*(m|min|mins|minutes?|h|hr|hrs|hours?|std)?\.?$/,
    );
    const n = match ? Number(match[1].replace(",", ".")) : NaN;
    if (!match || !Number.isFinite(n) || n <= 0) {
      setDurationError("Use minutes or hours, e.g. 30m or 2h");
      return undefined;
    }
    const isHours = (match[2] ?? "m").startsWith("h") || match[2] === "std";
    return Math.max(1, Math.round(isHours ? n * 60 : n));
  }

  function parseNotifyOnDue(values: FormValues): boolean | null {
    return values.notifyOnDue === "" ? null : values.notifyOnDue === "true";
  }

  async function submit(values: FormValues) {
    const title = values.title.trim();
    if (!title) {
      setTitleError("Title is required");
      return;
    }
    const rec = parseRecurrenceFields(values);
    if (!rec) return;
    const durationMinutes = parseDuration(values);
    if (durationMinutes === undefined) return;
    const notifyOnDue = parseNotifyOnDue(values);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: task ? "Saving…" : "Creating…",
    });
    try {
      if (task) {
        await api(`/api/tasks/${task.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            title,
            note: values.note,
            dueDate: values.dueDate ? values.dueDate.toISOString() : null,
            priority: values.priority,
            workspaceId: values.workspaceId || null,
            recurrence: rec.recurrence,
            recurrenceDays: rec.recurrenceDays,
            durationMinutes,
            notifyOnDue,
          }),
        });
      } else {
        await api<Task>("/api/tasks", {
          method: "POST",
          body: JSON.stringify({
            title,
            note: values.note || undefined,
            dueDate: values.dueDate ? values.dueDate.toISOString() : undefined,
            priority: values.priority,
            workspaceId: values.workspaceId || undefined,
            parentId,
            recurrence: rec.recurrence ?? undefined,
            recurrenceDays: rec.recurrenceDays,
            durationMinutes: durationMinutes ?? undefined,
            notifyOnDue: notifyOnDue ?? undefined,
          }),
        });
      }
      toast.style = Toast.Style.Success;
      toast.title = task ? "Task saved" : "Task created";
      onSaved();
      await refreshMenuBar();
      pop();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = task ? "Failed to save task" : "Failed to create task";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  async function submitWithAi(values: FormValues) {
    const text = values.title.trim();
    if (!text) {
      setTitleError("Title is required");
      return;
    }
    const rec = parseRecurrenceFields(values);
    if (!rec) return;
    const durationMinutes = parseDuration(values);
    if (durationMinutes === undefined) return;
    const notifyOnDue = parseNotifyOnDue(values);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Parsing with AI…",
    });
    try {
      const parsed = await api<ParsedTask>("/api/ai/parse", {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      toast.title = "Creating…";
      await api<Task>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: parsed.title,
          note: parsed.note ?? (values.note || undefined),
          dueDate:
            parsed.dueDate ??
            (values.dueDate ? values.dueDate.toISOString() : undefined),
          priority: parsed.priority ?? values.priority,
          workspaceId: values.workspaceId || undefined,
          parentId,
          recurrence: rec.recurrence ?? undefined,
          recurrenceDays: rec.recurrenceDays,
          durationMinutes: durationMinutes ?? undefined,
          notifyOnDue: notifyOnDue ?? undefined,
        }),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Task created";
      toast.message = parsed.title;
      onSaved();
      await refreshMenuBar();
      pop();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      if (err instanceof ApiError && err.status === 409) {
        toast.title = "AI not configured";
        toast.message =
          "Add your AI provider key in the TaskTickr web app settings to use AI parsing.";
      } else {
        toast.title = "Failed to create task with AI";
        toast.message = err instanceof Error ? err.message : String(err);
      }
    }
  }

  return (
    <Form
      navigationTitle={
        task ? "Edit Task" : parentId ? "Add Subtask" : "Add Task"
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={task ? "Save Task" : "Create Task"}
            icon={task ? Icon.Pencil : Icon.Plus}
            onSubmit={submit}
          />
          {!task && (
            <Action.SubmitForm
              title="Create with AI"
              icon={Icon.Stars}
              onSubmit={submitWithAi}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="What needs to be done?"
        defaultValue={task?.title}
        error={titleError}
        onChange={() => setTitleError(undefined)}
      />
      <Form.TextArea
        id="note"
        title="Note"
        placeholder="Optional details"
        defaultValue={task?.note ?? ""}
      />
      <Form.DatePicker
        id="dueDate"
        title="Due Date"
        defaultValue={task?.dueDate ? new Date(task.dueDate) : undefined}
      />
      <Form.Dropdown
        id="priority"
        title="Priority"
        defaultValue={task?.priority ?? "MEDIUM"}
      >
        {PRIORITIES.map((p) => (
          <Form.Dropdown.Item key={p.value} value={p.value} title={p.title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="recurrence"
        title="Recurrence"
        value={recurrence}
        onChange={setRecurrence}
      >
        <Form.Dropdown.Item value="" title="None" />
        {RECURRENCE_KINDS.map((kind) => (
          <Form.Dropdown.Item
            key={kind}
            value={kind}
            title={recurrenceLabel(kind)}
          />
        ))}
      </Form.Dropdown>
      {recurrence === "EVERY_N_DAYS" && (
        <Form.TextField
          id="recurrenceDays"
          title="Repeat Every (Days)"
          placeholder="3"
          defaultValue={String(task?.recurrenceDays ?? 3)}
          error={recurrenceDaysError}
          onChange={() => setRecurrenceDaysError(undefined)}
        />
      )}
      <Form.TextField
        id="duration"
        title="Duration"
        placeholder="e.g. 30m or 2h"
        defaultValue={
          task?.durationMinutes
            ? task.durationMinutes % 60 === 0
              ? `${task.durationMinutes / 60}h`
              : `${task.durationMinutes}m`
            : ""
        }
        error={durationError}
        onChange={() => setDurationError(undefined)}
      />
      <Form.Dropdown
        id="notifyOnDue"
        title="Notification on Due"
        defaultValue={task?.notifyOnDue == null ? "" : String(task.notifyOnDue)}
      >
        <Form.Dropdown.Item value="" title="Default" />
        <Form.Dropdown.Item value="true" title="On" />
        <Form.Dropdown.Item value="false" title="Off" />
      </Form.Dropdown>
      <Form.Dropdown
        id="workspaceId"
        title="Workspace"
        defaultValue={
          task ? (task.workspaceId ?? "") : (defaultWorkspaceId ?? "")
        }
      >
        <Form.Dropdown.Item value="" title="No Workspace" />
        {workspaces.map((w) => (
          <Form.Dropdown.Item key={w.id} value={w.id} title={w.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
