import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { fromCanonicalDateString } from "../lib/date";
import { type TaskFormController } from "../lib/task-form-controller";
import { createDefaultTaskFormController } from "../lib/task-form-controller-runtime";
import type { TaskFormValues } from "../lib/task-form-submit";
import { getTaskStatusLabel } from "../lib/tasks";
import { getTaskActionIcon, getTaskStatusIcon } from "../lib/task-visuals";
import type {
  TaskLogStatusBehavior,
  TaskRecord,
  TaskStatus,
  TaskWorkLogRecord,
} from "../lib/types";

export type TaskFormInitialFocus = "header" | "new_work_log";

export interface TaskFormProps {
  notePath: string;
  task?: TaskRecord;
  onDidSave?: () => Promise<void> | void;
  initialFocus?: TaskFormInitialFocus;
  resetOnSave?: boolean;
  statusBehavior?: TaskLogStatusBehavior;
  controller?: TaskFormController;
}

export default function TaskForm({
  notePath,
  task,
  onDidSave,
  initialFocus = "header",
  resetOnSave = false,
  statusBehavior = "auto_start",
  controller,
}: TaskFormProps) {
  const { pop } = useNavigation();
  const taskFormController = useMemo(
    () =>
      controller ??
      createDefaultTaskFormController(notePath, {
        pop,
        afterSaveImpl: resetOnSave && !task ? () => undefined : undefined,
      }),
    [controller, notePath, pop, resetOnSave, task],
  );
  const isEditing = Boolean(task);
  const [values, setValues] = useState<TaskFormValues>({
    header: task?.header ?? "",
    body: task?.body ?? "",
    status: task?.status ?? "todo",
    dueDate: fromCanonicalDateString(task?.dueDate),
    startDate: fromCanonicalDateString(task?.startDate),
    workLogs: task?.workLogs ?? [],
  });
  const [headerError, setHeaderError] = useState<string>();
  const [newWorkLogEntry, setNewWorkLogEntry] = useState("");
  const [focusedWorkLogId, setFocusedWorkLogId] = useState<string>();
  const [pendingFocusWorkLogId, setPendingFocusWorkLogId] = useState<string>();
  const headerRef = useRef<Form.TextField | null>(null);
  const newWorkLogRef = useRef<Form.TextArea | null>(null);
  const workLogRefs = useRef<Record<string, Form.TextArea | null>>({});
  const hasAppliedInitialFocus = useRef(false);

  useEffect(() => {
    if (!pendingFocusWorkLogId) {
      return;
    }

    workLogRefs.current[pendingFocusWorkLogId]?.focus();
    setFocusedWorkLogId(pendingFocusWorkLogId);
    setPendingFocusWorkLogId(undefined);
  }, [pendingFocusWorkLogId, values.workLogs]);

  useEffect(() => {
    if (hasAppliedInitialFocus.current) {
      return;
    }

    const focusTarget =
      initialFocus === "new_work_log"
        ? newWorkLogRef.current
        : headerRef.current;

    if (!focusTarget) {
      return;
    }

    focusTarget.focus();
    hasAppliedInitialFocus.current = true;
  }, [initialFocus]);

  async function handleSubmit() {
    const result = await taskFormController.submit({
      task,
      values,
      newWorkLogEntry,
      statusBehavior,
      onDidSave,
    });

    if (result === "missing_header") {
      setHeaderError("Header is required");
    }

    if (result === "saved" && resetOnSave && !isEditing) {
      setValues({
        header: "",
        body: "",
        status: "todo",
        dueDate: null,
        startDate: null,
        workLogs: [],
      });
      setHeaderError(undefined);
      setNewWorkLogEntry("");
      setFocusedWorkLogId(undefined);
      setPendingFocusWorkLogId(undefined);
      headerRef.current?.focus();
    }
  }

  async function handleDeleteFocusedWorkLog() {
    const result = await taskFormController.deleteFocusedWorkLog({
      values,
      focusedWorkLogId,
    });

    if (!result) {
      return;
    }

    setValues(result.values);
    setPendingFocusWorkLogId(result.pendingFocusWorkLogId);
    setFocusedWorkLogId(undefined);
  }

  return (
    <Form
      navigationTitle={isEditing ? "Edit Task" : "Add Task"}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.SubmitForm
              title={isEditing ? "Save Task" : "Create Task"}
              icon={
                isEditing
                  ? getTaskActionIcon("Save Task")
                  : getTaskActionIcon("Create Task")
              }
              onSubmit={handleSubmit}
            />
            {isEditing && focusedWorkLogId && (
              <Action
                title="Delete Work Log"
                icon={getTaskActionIcon("Delete Task")}
                style={Action.Style.Destructive}
                onAction={handleDeleteFocusedWorkLog}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        ref={headerRef}
        id="header"
        title="Title"
        placeholder="Task title"
        value={values.header}
        error={headerError}
        onChange={(newValue) => {
          setValues((currentValues) => ({
            ...currentValues,
            header: newValue,
          }));
          if (headerError && newValue.trim()) {
            setHeaderError(undefined);
          }
        }}
      />
      <Form.TextArea
        id="body"
        title="Description"
        placeholder="Optional markdown details"
        enableMarkdown
        value={values.body}
        onChange={(newValue) =>
          setValues((currentValues) => ({
            ...currentValues,
            body: newValue,
          }))
        }
      />
      <Form.Separator />
      <Form.Dropdown
        id="status"
        title="Status"
        value={values.status}
        onChange={(value) =>
          setValues((currentValues) => ({
            ...currentValues,
            status: value as TaskStatus,
          }))
        }
      >
        <Form.Dropdown.Item
          value="todo"
          title={getTaskStatusLabel("todo")}
          icon={getTaskStatusIcon("todo")}
        />
        <Form.Dropdown.Item
          value="in_progress"
          title={getTaskStatusLabel("in_progress")}
          icon={getTaskStatusIcon("in_progress")}
        />
        <Form.Dropdown.Item
          value="done"
          title={getTaskStatusLabel("done")}
          icon={getTaskStatusIcon("done")}
        />
        <Form.Dropdown.Item
          value="archived"
          title={getTaskStatusLabel("archived")}
          icon={getTaskStatusIcon("archived")}
        />
      </Form.Dropdown>
      <Form.DatePicker
        id="dueDate"
        title="Due Date"
        value={values.dueDate}
        onChange={(newValue) =>
          setValues((currentValues) => ({
            ...currentValues,
            dueDate: newValue,
          }))
        }
      />
      <Form.DatePicker
        id="startDate"
        title="Start Date"
        value={values.startDate}
        onChange={(newValue) =>
          setValues((currentValues) => ({
            ...currentValues,
            startDate: newValue,
          }))
        }
      />
      <Form.Separator />
      {isEditing && (
        <>
          <Form.Description
            title="Work Logs"
            text={
              values.workLogs.length > 0
                ? "Edit existing work logs below. Focus a work log field to enable ⌘D deletion."
                : "No work logs yet."
            }
          />
          {values.workLogs.map((workLog, index) => (
            <Form.TextArea
              key={workLog.id}
              ref={(ref) => {
                workLogRefs.current[workLog.id] = ref;
              }}
              id={`workLog-${workLog.id}`}
              title={`Log ${index + 1}`}
              info={buildWorkLogInfo(workLog)}
              enableMarkdown
              value={workLog.body}
              onFocus={() => setFocusedWorkLogId(workLog.id)}
              onBlur={() =>
                setFocusedWorkLogId((currentValue) =>
                  currentValue === workLog.id ? undefined : currentValue,
                )
              }
              onChange={(newValue) =>
                setValues((currentValues) => ({
                  ...currentValues,
                  workLogs: currentValues.workLogs.map((candidate) =>
                    candidate.id === workLog.id
                      ? { ...candidate, body: newValue }
                      : candidate,
                  ),
                }))
              }
            />
          ))}
        </>
      )}
      <Form.TextArea
        ref={newWorkLogRef}
        id="newWorkLogEntry"
        title="New Log Entry"
        placeholder="Log the work you completed for this task"
        enableMarkdown
        value={newWorkLogEntry}
        onChange={setNewWorkLogEntry}
      />
    </Form>
  );
}

function buildWorkLogInfo(workLog: TaskWorkLogRecord): string {
  const created = new Date(workLog.createdAt).toLocaleString();
  if (!workLog.updatedAt) {
    return `Logged ${created}`;
  }

  return `Logged ${created}. Edited ${new Date(workLog.updatedAt).toLocaleString()}`;
}
