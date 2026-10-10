import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { TASK_CONTROL_MAX_MINUTES, type TaskAction, type TaskSnapshot } from "../vendor/task-control";
import { formatTaskDurationLabel } from "../vendor/task-durations";
import { useTasks } from "../task-state";

type Purpose = "start" | "edit" | "review-edit" | "lock";
type Submission = { status: "editing" } | { status: "submitting" } | { status: "saved"; snapshotRevision: number };
const MAX_CUSTOM_TASK_MINUTES = 9 * 60 + 99;

export function TaskForm({
  navigationTitle,
  purpose,
  displayed,
  description = "",
  durationMinutes,
  onSaved,
  revision = 0,
}: {
  navigationTitle?: string;
  purpose: Purpose;
  displayed: TaskSnapshot;
  description?: string;
  durationMinutes?: number;
  onSaved?: () => void;
  revision?: number;
}) {
  const { perform, busy, error, snapshot, snapshotRevision, routeDepth } = useTasks();
  const { pop } = useNavigation();
  const [text, setText] = useState(description);
  const descriptionField = useRef<Form.TextArea>(null);
  const focusedRevision = useRef(0);
  const initialMinutes = Math.min(durationMinutes ?? displayed.defaultDurationMinutes, displayed.maxDurationMinutes);
  const [choice, setChoice] = useState(String(initialMinutes));
  const [custom, setCustom] = useState("");
  const [validation, setValidation] = useState<string | null>(null);
  const [submission, setSubmission] = useState<Submission>({ status: "editing" });
  const checking = snapshot?.review?.status === "checking";
  const waiting = busy || checking || submission.status !== "editing";
  const navigated = useRef(false);
  const submitting = useRef(false);
  const [previousRevision, setPreviousRevision] = useState(revision);
  if (previousRevision !== revision) {
    setPreviousRevision(revision);
    setText(description);
    setChoice(String(initialMinutes));
    setCustom("");
    setValidation(null);
    setSubmission({ status: "editing" });
    navigated.current = false;
    submitting.current = false;
  }
  useEffect(() => {
    if (
      submission.status !== "saved" ||
      snapshotRevision < submission.snapshotRevision ||
      busy ||
      checking ||
      navigated.current
    )
      return;
    navigated.current = true;
    if (onSaved) onSaved();
    else for (let remaining = Math.max(1, routeDepth); remaining > 0; remaining--) pop();
  }, [submission, snapshotRevision, busy, checking, pop, onSaved, routeDepth]);
  const revisingStart = purpose === "start" && displayed.review?.kind === "start";
  useEffect(() => {
    if (!revision || focusedRevision.current === revision || busy || checking || submission.status !== "editing")
      return;
    descriptionField.current?.focus();
    focusedRevision.current = revision;
  }, [revision, busy, checking, submission]);
  const minutes = Number(purpose === "lock" || choice === "custom" ? custom : choice);
  const label = {
    start: "Start Task",
    edit: "Save Task",
    "review-edit": "Check Task",
    lock: "Lock Task",
  }[purpose];

  const submit = async () => {
    if (waiting || submitting.current) return;
    if (purpose !== "lock" && (!text.trim() || text.length > displayed.descriptionLimit)) {
      setValidation("Enter your task description");
      return;
    }
    const maxMinutes =
      purpose === "lock" ? TASK_CONTROL_MAX_MINUTES : Math.min(displayed.maxDurationMinutes, MAX_CUSTOM_TASK_MINUTES);
    if (
      (purpose === "start" || purpose === "lock") &&
      (!Number.isInteger(minutes) || minutes < 1 || minutes > maxMinutes)
    ) {
      setValidation(`Choose a duration between 1 and ${maxMinutes} minutes.`);
      return;
    }
    setValidation(null);
    let action: TaskAction;
    switch (purpose) {
      case "start":
        action = {
          ...(revisingStart
            ? ({ kind: "review-edit", message: text.trim() } as const)
            : ({ kind: "start", description: text.trim() } as const)),
          durationMinutes: minutes,
          ...(choice === "custom" ? { customDuration: true } : {}),
        };
        break;
      case "edit":
        action = { kind: "edit", description: text.trim() };
        break;
      case "review-edit":
        action = { kind: purpose, message: text.trim() };
        break;
      case "lock":
        action = { kind: "lock", durationMinutes: minutes };
        break;
    }
    submitting.current = true;
    setSubmission({ status: "submitting" });
    const accepted = await perform(action, displayed);
    if (accepted) setSubmission({ status: "saved", ...accepted });
    else {
      submitting.current = false;
      setSubmission({ status: "editing" });
    }
  };

  return (
    <Form
      navigationTitle={navigationTitle}
      isLoading={waiting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={label} shortcut={{ modifiers: [], key: "return" }} onSubmit={submit} />
        </ActionPanel>
      }
    >
      {purpose === "lock" ? (
        <Form.Description text="You won’t be able to pause, stop, complete, or make this task easier for the duration of the lock. The lock cannot be undone." />
      ) : (
        <Form.TextArea
          ref={descriptionField}
          autoFocus
          id="description"
          title="Task"
          placeholder="What do you want to work on?"
          value={text}
          onChange={(value) => {
            if (!waiting) setText(value);
          }}
          error={validation ?? undefined}
        />
      )}
      {purpose === "start" && (
        <Form.Dropdown
          id="duration"
          title="Duration"
          value={choice}
          onChange={(value) => {
            if (!waiting) setChoice(value);
          }}
        >
          {[...new Set([initialMinutes, ...displayed.durationChoices])]
            .filter((minutes) => minutes <= displayed.maxDurationMinutes)
            .map((minutes) => (
              <Form.Dropdown.Item key={minutes} value={String(minutes)} title={formatTaskDurationLabel(minutes)} />
            ))}
          {displayed.customDurationAllowed && <Form.Dropdown.Item value="custom" title="Custom…" />}
        </Form.Dropdown>
      )}
      {(purpose === "lock" || (purpose === "start" && choice === "custom")) && (
        <Form.TextField
          autoFocus={purpose === "lock"}
          id="minutes"
          title="Minutes"
          placeholder={purpose === "lock" ? "How long should the lock last?" : "45"}
          value={custom}
          onChange={(value) => {
            if (!waiting) setCustom(value);
          }}
          error={validation ?? undefined}
        />
      )}
      {purpose === "start" && !displayed.customDurationAllowed && (
        <Form.Description
          text={`Your plan allows tasks up to ${formatTaskDurationLabel(displayed.maxDurationMinutes)}.`}
        />
      )}
      {purpose === "edit" && displayed.task?.locked && (
        <Form.Description text="This task is locked. Changes still need to respect its commitment." />
      )}
      {error && !waiting && <Form.Description title="Couldn’t save" text={error} />}
      {validation && purpose === "start" && choice !== "custom" && <Form.Description text={validation} />}
    </Form>
  );
}
