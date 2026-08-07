import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  getPreferenceValues,
  open,
  popToRoot,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Label, Project } from "../api";
import { formatUser, resolveAssignees } from "../helpers/assignees";
import type { ResolvedAssignees } from "../helpers/assignees";
import { addToHistory } from "../helpers/history";
import {
  NEW_LABEL_PREFIX,
  REPEAT_NONE,
  REPEAT_UNITS,
  buildRepeatPayload,
  secondsToRepeat,
  submitQuickAdd,
} from "../helpers/magic";
import type { MagicPreview } from "../helpers/magic";
import { PRIORITY_MAP } from "../helpers/priorities";

interface Props {
  preview: MagicPreview;
  projects: Project[];
  labels: Label[];
  defaultProjectId: number;
}

/**
 * Confirmation step for Quick Add. Every field is controlled so the prefilled
 * values cannot be dropped by a race with the async project/label lists.
 */
export default function QuickAddForm({
  preview,
  projects,
  labels,
  defaultProjectId,
}: Props) {
  const [title, setTitle] = useState(preview.title);
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(String(defaultProjectId));
  const [dueDate, setDueDate] = useState<Date | null>(preview.parsed.date);
  const [priority, setPriority] = useState(
    String(preview.parsed.priority ?? 0),
  );
  const [labelValues, setLabelValues] = useState<string[]>(preview.labelValues);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialRepeat = preview.repeat
    ? secondsToRepeat(preview.repeat.repeat_after)
    : { unit: REPEAT_NONE as string, amount: 1 };
  const [repeatUnit, setRepeatUnit] = useState<string>(initialRepeat.unit);
  const [repeatAmount, setRepeatAmount] = useState(
    String(initialRepeat.amount),
  );

  // Assignees can only be looked up per project, so this re-runs whenever the
  // selected project changes.
  const [assignees, setAssignees] = useState<ResolvedAssignees>({
    matched: [],
    matchedNames: [],
    unmatchedNames: [],
  });
  const [isResolvingAssignees, setIsResolvingAssignees] = useState(
    preview.assigneeNames.length > 0,
  );

  useEffect(() => {
    if (preview.assigneeNames.length === 0) {
      setIsResolvingAssignees(false);
      return;
    }

    const numericProjectId = parseInt(projectId);
    if (isNaN(numericProjectId)) return;

    let cancelled = false;
    setIsResolvingAssignees(true);

    resolveAssignees(preview.assigneeNames, numericProjectId)
      .then((result) => {
        if (!cancelled) setAssignees(result);
      })
      .finally(() => {
        if (!cancelled) setIsResolvingAssignees(false);
      });

    // Guards against a slower earlier lookup overwriting a newer one.
    return () => {
      cancelled = true;
    };
  }, [projectId, preview.assigneeNames]);

  // New labels are offered as synthetic options so they stay editable and are
  // only actually created on submit.
  const newLabelOptions = preview.missingLabelTitles.map((t) => ({
    value: `${NEW_LABEL_PREFIX}${t}`,
    title: `${t} (new)`,
  }));

  async function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed) {
      showToast({ style: Toast.Style.Failure, title: "Title is required" });
      return;
    }

    const numericProjectId = parseInt(projectId);
    if (isNaN(numericProjectId)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please select a project",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      showToast({ style: Toast.Style.Animated, title: "Creating task…" });

      const amount = parseInt(repeatAmount);
      const repeat =
        repeatUnit === REPEAT_NONE
          ? null
          : (buildRepeatPayload(repeatUnit, isNaN(amount) ? 1 : amount) ??
            null);

      const task = await submitQuickAdd(
        preview,
        numericProjectId,
        labelValues,
        {
          title: trimmed,
          description,
          dueDate,
          priority: parseInt(priority) || 0,
          isFavorite,
          repeat,
          assignees: assignees.matched,
        },
      );
      await addToHistory(preview.input);
      showToast({
        style: Toast.Style.Success,
        title: "Task created",
        message: task.title,
        primaryAction: {
          title: "Open in Vikunja",
          onAction: () => {
            const { apiUrl } = getPreferenceValues<Preferences>();
            open(`${apiUrl.replace(/\/+$/, "")}/projects/${numericProjectId}`);
          },
        },
      });
      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Task"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Parsed From" text={preview.input} />

      <Form.TextField
        id="title"
        title="Title"
        placeholder="Task title"
        value={title}
        onChange={setTitle}
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional description"
        value={description}
        onChange={setDescription}
      />

      <Form.Dropdown
        id="projectId"
        title="Project"
        value={projectId}
        onChange={setProjectId}
      >
        {projects.map((project) => (
          <Form.Dropdown.Item
            key={project.id}
            value={String(project.id)}
            title={project.title}
          />
        ))}
      </Form.Dropdown>

      {preview.unmatchedProject && (
        <Form.Description
          title=""
          text={`Note: "+${preview.unmatchedProject}" did not match any project, so it was left unset. Pick one above.`}
        />
      )}

      <Form.DatePicker
        id="dueDate"
        title="Due Date"
        value={dueDate}
        onChange={setDueDate}
      />

      <Form.Dropdown
        id="priority"
        title="Priority"
        value={priority}
        onChange={setPriority}
      >
        {Object.entries(PRIORITY_MAP).map(([value, label]) => (
          <Form.Dropdown.Item key={value} value={value} title={label} />
        ))}
      </Form.Dropdown>

      <Form.TagPicker
        id="labelIds"
        title="Labels"
        value={labelValues}
        onChange={setLabelValues}
      >
        {newLabelOptions.map((opt) => (
          <Form.TagPicker.Item
            key={opt.value}
            value={opt.value}
            title={opt.title}
            icon={Icon.PlusCircle}
          />
        ))}
        {labels.map((label) => (
          <Form.TagPicker.Item
            key={label.id}
            value={String(label.id)}
            title={label.title}
          />
        ))}
      </Form.TagPicker>

      <Form.Dropdown
        id="repeatUnit"
        title="Repeats"
        value={repeatUnit}
        onChange={setRepeatUnit}
      >
        <Form.Dropdown.Item value={REPEAT_NONE} title="Does not repeat" />
        {REPEAT_UNITS.map((unit) => (
          <Form.Dropdown.Item key={unit} value={unit} title={unit} />
        ))}
      </Form.Dropdown>

      {repeatUnit !== REPEAT_NONE && (
        <Form.TextField
          id="repeatAmount"
          title="Every"
          placeholder="1"
          value={repeatAmount}
          onChange={setRepeatAmount}
        />
      )}

      {preview.reminderLabel && (
        <Form.Description
          title="Reminder"
          text={
            dueDate
              ? preview.reminderLabel
              : `${preview.reminderLabel} — set a due date for this to apply`
          }
        />
      )}

      {preview.assigneeNames.length > 0 && (
        <Form.Description
          title="Assignees"
          text={
            isResolvingAssignees
              ? `Looking up ${preview.assigneeNames.join(", ")}…`
              : [
                  assignees.matched.length > 0
                    ? `Assigning: ${assignees.matched.map(formatUser).join(", ")}`
                    : null,
                  assignees.unmatchedNames.length > 0
                    ? `Not a member of this project: ${assignees.unmatchedNames.join(", ")}`
                    : null,
                ]
                  .filter(Boolean)
                  .join("\n")
          }
        />
      )}

      <Form.Checkbox
        id="isFavorite"
        title="Favorite"
        label="Mark as favorite"
        value={isFavorite}
        onChange={setIsFavorite}
      />
    </Form>
  );
}
