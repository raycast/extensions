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
import { appendTodo, parseLine } from "./storage";
import { useValidatedPrefs } from "./preferences";

/**
 * Quick Add — a single text field that accepts either:
 *   1. Raw todo.txt syntax: "(A) 2024-01-20 Fix bug +raycast @dev due:2024-01-25"
 *   2. Plain text: "Fix the login page" (creation date auto-appended)
 *
 * The line is written as-is to todo.txt after validation.
 */
export default function QuickAdd() {
  const { pop } = useNavigation();
  const { prefs, pathsValid } = useValidatedPrefs();
  const today = new Date().toISOString().split("T")[0];

  const [raw, setRaw] = useState("");
  const [addDate, setAddDate] = useState(true);
  const [rawError, setRawError] = useState<string | undefined>();

  function buildLine(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) return "";

    // Already has a priority or looks like complete todo.txt syntax → keep as-is
    const hasDate = /^\(?\d{4}-\d{2}-\d{2}/.test(trimmed);
    const hasPriority = /^\([A-Z]\) /.test(trimmed);
    const hasCompletionMark = trimmed.startsWith("x ");

    if (hasCompletionMark || hasPriority || hasDate) {
      return trimmed;
    }

    // Plain text → optionally prefix with today's creation date
    if (addDate) {
      return `${today} ${trimmed}`;
    }
    return trimmed;
  }

  function validate(): boolean {
    if (!raw.trim()) {
      setRawError("Please enter a task");
      return false;
    }
    setRawError(undefined);
    return true;
  }

  async function handleSubmit() {
    if (!pathsValid || !validate()) return;

    const line = buildLine(raw);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding task…",
    });
    try {
      await appendTodo(prefs.todoFilePath, line);
      toast.style = Toast.Style.Success;
      toast.title = "Task added";
      setRaw("");
      pop();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to add task";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  // Live preview
  const preview = buildLine(raw) || "(type a task above…)";

  // Quick parse to show detected fields
  const parsed = raw.trim() ? parseLine(buildLine(raw), 0) : null;

  return (
    <Form
      navigationTitle="Quick Add Todo"
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
        id="raw"
        title="Task"
        placeholder="(B) 2026-06-02 Update documentation +work @docs due:2026-06-05"
        value={raw}
        onChange={setRaw}
        error={rawError}
        autoFocus
        info="Accepts plain text or full todo.txt syntax"
      />

      <Form.Checkbox
        id="addDate"
        label={`Auto-add creation date (${today})`}
        value={addDate}
        onChange={setAddDate}
        info="Adds today's date as creation date for plain text entries"
      />

      <Form.Separator />

      <Form.Description title="Preview" text={preview} />

      {parsed && (
        <>
          {parsed.priority && (
            <Form.Description title="Priority" text={`(${parsed.priority})`} />
          )}
          {parsed.projects.length > 0 && (
            <Form.Description
              title="Projects"
              text={parsed.projects.map((p) => `+${p}`).join(", ")}
            />
          )}
          {parsed.contexts.length > 0 && (
            <Form.Description
              title="Contexts"
              text={parsed.contexts.map((c) => `@${c}`).join(", ")}
            />
          )}
          {Object.keys(parsed.tags).length > 0 && (
            <Form.Description
              title="Tags"
              text={Object.entries(parsed.tags)
                .map(([k, v]) => `${k}:${v}`)
                .join(", ")}
            />
          )}
        </>
      )}
    </Form>
  );
}
