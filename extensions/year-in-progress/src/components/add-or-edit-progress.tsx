import { Action, ActionPanel, Form } from "@raycast/api";
import { useRef, useState } from "react";
import { Progress, ProgressFormErrors, ProgressFormValues } from "../types";
import { supportsMenuBar } from "../utils/platform";
import { createProgressFormValues, validateProgressForm } from "../utils/validation";

type AddOrEditProgressProps = {
  progress?: Extract<Progress, { type: "user" }>;
  allProgress: readonly Progress[];
  onSubmit: (values: ProgressFormValues) => Promise<void>;
};

export default function AddOrEditProgress({ progress, allProgress, onSubmit }: AddOrEditProgressProps) {
  const [values, setValues] = useState<ProgressFormValues>(() => createProgressFormValues(progress));
  const [errors, setErrors] = useState<ProgressFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitPending = useRef(false);

  const updateValues = (change: Partial<ProgressFormValues>) => {
    const nextValues = { ...values, ...change };
    setValues(nextValues);
    setErrors(validateProgressForm(nextValues, allProgress, progress?.id));
  };

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm<ProgressFormValues>
            title="Save Progress"
            onSubmit={async (submitted) => {
              if (submitPending.current) return;
              const nextValues = { ...values, ...submitted };
              const nextErrors = validateProgressForm(nextValues, allProgress, progress?.id);
              setValues(nextValues);
              setErrors(nextErrors);
              if (Object.keys(nextErrors).length) return;
              submitPending.current = true;
              setIsSubmitting(true);
              try {
                await onSubmit(nextValues);
              } finally {
                submitPending.current = false;
                setIsSubmitting(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Progress Title"
        placeholder="Enter the progress title"
        value={values.title}
        onChange={(title) => updateValues({ title })}
        error={errors.title}
      />
      <Form.TextField
        id="menubarTitle"
        title={supportsMenuBar ? "Title in Menu Bar" : "Progress Label"}
        placeholder="Enter a short progress label"
        value={values.menubarTitle}
        onChange={(menubarTitle) => updateValues({ menubarTitle })}
        error={errors.menubarTitle}
      />
      <Form.DatePicker
        id="startDate"
        title="Start Date"
        value={values.startDate}
        onChange={(startDate) => updateValues({ startDate })}
        error={errors.startDate}
      />
      <Form.DatePicker
        id="endDate"
        title="End Date"
        value={values.endDate}
        onChange={(endDate) => updateValues({ endDate })}
        error={errors.endDate}
      />
      {supportsMenuBar && (
        <Form.Checkbox
          id="showInMenubar"
          title="Show in Menu Bar"
          label="Show This Progress"
          value={values.showInMenubar}
          onChange={(showInMenubar) => updateValues({ showInMenubar })}
        />
      )}
      <Form.Checkbox
        id="showAsCommand"
        title="Show in Command Subtitle"
        label="Use for the Progress Command"
        value={values.showAsCommand}
        onChange={(showAsCommand) => updateValues({ showAsCommand })}
      />
    </Form>
  );
}
