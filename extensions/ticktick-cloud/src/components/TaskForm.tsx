import { Action, ActionPanel, Color, Form, Icon } from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Project } from "../domain/project";
import {
  availableMoveProjects,
  createSubmissionGate,
  type SubmissionGate,
  type TaskDateSemantics,
  type TaskFormValidationErrors,
  type TaskFormValues,
  validateTaskFormValues,
} from "./taskFormModel";

export type TaskFormMode = "create" | "edit";

export interface TaskFormFieldAvailability {
  project: boolean;
  description: boolean;
  startDate: boolean;
  dueDate: boolean;
  isAllDay: boolean;
  priority: boolean;
  tags: boolean;
}

export interface TaskFormProps {
  mode: TaskFormMode;
  projects: readonly Project[];
  initialValues: TaskFormValues;
  dateSemantics: TaskDateSemantics;
  onSubmit(values: TaskFormValues): Promise<void>;
  fieldAvailability?: Partial<TaskFormFieldAvailability>;
}

export default function TaskForm({
  mode,
  projects,
  initialValues,
  dateSemantics,
  onSubmit,
  fieldAvailability,
}: TaskFormProps) {
  // Defaults are deliberately read only for the first mount. Project/default-title hydration
  // must finish before mounting this form, so a late async result cannot overwrite user input.
  const [values, setValues] = useState<TaskFormValues>(() => initialValues);
  const [errors, setErrors] = useState<TaskFormValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mounted = useRef(true);
  const submissionGate = useRef<SubmissionGate | undefined>(undefined);
  if (!submissionGate.current) {
    submissionGate.current = createSubmissionGate((submitting) => {
      if (mounted.current) setIsSubmitting(submitting);
    });
  }
  const openProjects = useMemo(() => availableMoveProjects(projects, ""), [projects]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const available = (field: keyof TaskFormFieldAvailability) => fieldAvailability?.[field] ?? true;

  const submit = () => {
    const gate = submissionGate.current!;
    if (gate.terminalError) return gate.submit(async () => true);

    const validation = validateTaskFormValues(values, { projects, ...dateSemantics });
    setErrors(validation);
    if (Object.keys(validation).length > 0) return false;

    return gate.submit(async () => {
      await onSubmit(values);
      return true;
    });
  };

  const setTitle = (title: string) => {
    setValues((current) => ({ ...current, title }));
    if (errors.title) setErrors((current) => ({ ...current, title: undefined }));
  };

  const setProjectId = (projectId: string) => {
    setValues((current) => ({ ...current, projectId }));
    if (errors.projectId) setErrors((current) => ({ ...current, projectId: undefined }));
  };

  const setStartDate = (startDate: Date | null) => {
    setValues((current) => ({ ...current, startDate }));
    if (errors.dateInterval) setErrors((current) => ({ ...current, dateInterval: undefined }));
  };

  const setDueDate = (dueDate: Date | null) => {
    setValues((current) => ({ ...current, dueDate }));
    if (errors.dateInterval) setErrors((current) => ({ ...current, dateInterval: undefined }));
  };

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={mode === "create" ? "Create Task" : "Save Task"}
            icon={mode === "create" ? Icon.Plus : Icon.Check}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Task title"
        autoFocus
        value={values.title}
        error={errors.title}
        onChange={setTitle}
      />

      {available("project") ? (
        <Form.Dropdown
          id="projectId"
          title="List"
          value={values.projectId}
          error={errors.projectId}
          onChange={setProjectId}
        >
          {openProjects.map((project) => (
            <Form.Dropdown.Item key={project.id} value={project.id} title={project.name} />
          ))}
        </Form.Dropdown>
      ) : null}

      {available("description") ? (
        <Form.TextArea
          id="description"
          title="Description"
          value={values.description}
          onChange={(description) => setValues((current) => ({ ...current, description }))}
        />
      ) : null}

      {available("startDate") ? (
        <Form.DatePicker
          id="startDate"
          title="Start"
          type={values.isAllDay ? Form.DatePicker.Type.Date : Form.DatePicker.Type.DateTime}
          value={values.startDate}
          error={!available("dueDate") ? errors.dateInterval : undefined}
          onChange={setStartDate}
        />
      ) : null}

      {available("dueDate") ? (
        <Form.DatePicker
          id="dueDate"
          title="Due"
          type={values.isAllDay ? Form.DatePicker.Type.Date : Form.DatePicker.Type.DateTime}
          value={values.dueDate}
          error={errors.dateInterval}
          onChange={setDueDate}
        />
      ) : null}

      {available("isAllDay") ? (
        <Form.Checkbox
          id="isAllDay"
          title="Date Type"
          label="All-day task"
          value={values.isAllDay}
          onChange={(isAllDay) => {
            setValues((current) => ({ ...current, isAllDay }));
            if (errors.dateInterval) setErrors((current) => ({ ...current, dateInterval: undefined }));
          }}
        />
      ) : null}

      {available("priority") ? (
        <Form.Dropdown
          id="priority"
          title="Priority"
          value={values.priority}
          onChange={(priority) =>
            setValues((current) => ({ ...current, priority: priority as TaskFormValues["priority"] }))
          }
        >
          <Form.Dropdown.Item value="0" title="None" icon={{ source: Icon.Circle, tintColor: Color.PrimaryText }} />
          <Form.Dropdown.Item value="1" title="Low" icon={{ source: Icon.Circle, tintColor: Color.Blue }} />
          <Form.Dropdown.Item value="3" title="Medium" icon={{ source: Icon.Circle, tintColor: Color.Yellow }} />
          <Form.Dropdown.Item value="5" title="High" icon={{ source: Icon.Circle, tintColor: Color.Red }} />
        </Form.Dropdown>
      ) : null}

      {available("tags") ? (
        <Form.TextField
          id="tags"
          title="Tags"
          placeholder="work, important"
          value={values.tags}
          onChange={(tags) => setValues((current) => ({ ...current, tags }))}
        />
      ) : null}
    </Form>
  );
}
