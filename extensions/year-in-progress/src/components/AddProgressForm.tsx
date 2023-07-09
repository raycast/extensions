import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import { useCachedProgressState } from "../hooks";
import { Progress } from "../types";

export type AddProgressFormValue = Omit<Progress, "key" | "type" | "progressNumber">;

type FormError = {
  titleError: string | undefined;
  titleInMenubarError: string | undefined;
  startDateError: string | undefined;
  endDateError: string | undefined;
  showInMenuBarError: string | undefined;
};

type AddProgressFormProps = {
  defaultFormValues?: AddProgressFormValue;
  onSubmit: any;
};

export default function AddProgressForm(props: AddProgressFormProps) {
  const [userProgress] = useCachedProgressState();

  const [formValue, setFormValue] = useState<Partial<Progress>>(
    props.defaultFormValues || {
      title: undefined,
      menubarTitle: undefined,
      startDate: new Date(),
      endDate: new Date(),
      showInMenuBar: false,
    }
  );
  const [error, setError] = useState<FormError>({
    titleError: undefined,
    titleInMenubarError: undefined,
    startDateError: undefined,
    endDateError: undefined,
    showInMenuBarError: undefined,
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            onSubmit={async (values) => {
              props.onSubmit?.(values);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Progress Title"
        placeholder="Enter the progress title"
        value={formValue.title}
        onBlur={(event) => {
          const title = event.target.value;
          if (!title) {
            setError({ ...error, titleError: "The field should't be empty!" });
          } else if (!props.defaultFormValues && userProgress.findIndex((progress) => progress.title === title) > -1) {
            setError({ ...error, titleError: "The progress already exists!" });
          } else {
            setError({ ...error, titleError: undefined });
          }
          setFormValue({ ...formValue, title });
        }}
        onChange={(title) => {
          if (!title) {
            setError({ ...error, titleError: "The field should't be empty!" });
          } else if (!props.defaultFormValues && userProgress.findIndex((progress) => progress.title === title) > -1) {
            setError({ ...error, titleError: "The progress already exists!" });
          } else {
            setError({ ...error, titleError: undefined });
          }
          setFormValue({ ...formValue, title });
        }}
        error={error.titleError}
      />
      <Form.TextField
        id="menubarTitle"
        title="Title In Menu Bar"
        placeholder="Enter the title In Menu Bar"
        value={formValue.menubarTitle}
        onBlur={(event) => {
          const title = event.target.value;
          if (!title) {
            setError({ ...error, titleInMenubarError: "The field should't be empty!" });
          } else {
            setError({ ...error, titleInMenubarError: undefined });
          }
          setFormValue({ ...formValue, menubarTitle: title });
        }}
        onChange={(title) => {
          if (!title) {
            setError({ ...error, titleInMenubarError: "The field should't be empty!" });
          } else {
            setError({ ...error, titleInMenubarError: undefined });
          }
          setFormValue({ ...formValue, menubarTitle: title });
        }}
        error={error.titleInMenubarError}
      />
      <Form.DatePicker
        id="startDate"
        title="Start Date"
        value={formValue.startDate}
        onChange={(startDate) => {
          if (!startDate) {
            setError({ ...error, startDateError: "The field should't be empty!" });
          } else if (new Date(startDate).getTime() >= new Date(formValue.endDate as Date).getTime()) {
            setError({ ...error, startDateError: "The start date must earlier than end date!" });
          } else {
            setError({ ...error, startDateError: undefined, endDateError: undefined });
          }
          setFormValue({ ...formValue, startDate: startDate as Date });
        }}
        error={error.startDateError}
      />
      <Form.DatePicker
        id="endDate"
        title="End Date"
        value={formValue.endDate}
        onChange={(endDate) => {
          if (!endDate) {
            setError({ ...error, endDateError: "The field should't be empty!" });
          } else if (!formValue.startDate) {
            setError({ ...error, startDateError: "The field should't be empty!", endDateError: undefined });
          } else if (new Date(endDate).getTime() <= new Date(formValue.startDate as Date).getTime()) {
            setError({ ...error, endDateError: "The start date must earlier than end date!" });
          } else {
            setError({ ...error, endDateError: undefined, startDateError: undefined });
          }
          setFormValue({ ...formValue, endDate: endDate as Date });
        }}
        error={error.endDateError}
      />
      <Form.Checkbox
        id="showInMenuBar"
        title="Show in Menu Bar"
        label="Yes"
        value={formValue.showInMenuBar}
        onChange={(showInMenuBar) => {
          setFormValue({ ...formValue, showInMenuBar });
        }}
      />
    </Form>
  );
}
