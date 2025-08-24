import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import { useLocalStorageProgress } from "../hooks/use-local-storage-progress";
import { Progress } from "../types";

type FormError = {
  titleError: string | undefined;
  menubarTitleError: string | undefined;
  startDateError: string | undefined;
  endDateError: string | undefined;
  showInMenubarError: string | undefined;
};

type AddOrEditProgressProps = {
  progress?: Progress;
  onSubmit: (values: FormValues) => Promise<void>;
};

export type FormValues = {
  title: string | undefined;
  menubarTitle: string | undefined;
  startDate: Date;
  endDate: Date;
  showInMenubar: boolean;
  showAsCommand: boolean;
};

export default function AddOrEditProgress(props: AddOrEditProgressProps) {
  const [state] = useLocalStorageProgress();

  const [formValue, setFormValue] = useState<FormValues>(
    props.progress
      ? {
          title: props.progress.title,
          menubarTitle: props.progress.menubar.title,
          startDate: new Date(props.progress.startDate),
          endDate: new Date(props.progress.endDate),
          showInMenubar: props.progress.menubar.shown ?? false,
          showAsCommand: props.progress.showAsCommand ?? false,
        }
      : {
          title: undefined,
          menubarTitle: undefined,
          startDate: new Date(),
          endDate: new Date(),
          showInMenubar: false,
          showAsCommand: false,
        }
  );
  const [error, setError] = useState<FormError>({
    titleError: undefined,
    menubarTitleError: undefined,
    startDateError: undefined,
    endDateError: undefined,
    showInMenubarError: undefined,
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={props.onSubmit} />
        </ActionPanel>
      }
    >
      {props.progress ? (
        // edit mode
        <Form.Description title="title" text={props.progress?.title as string} />
      ) : (
        // creation mode
        <Form.TextField
          id="title"
          title="Progress Title"
          placeholder="Enter the progress title"
          value={formValue.title}
          onBlur={(event) => {
            const title = event.target.value;
            if (!title) {
              setError({ ...error, titleError: "The field should't be empty!" });
            } else if (!props.progress && state.allProgress.findIndex((progress) => progress.title === title) > -1) {
              setError({ ...error, titleError: "The progress already exists!" });
            } else {
              setError({ ...error, titleError: undefined });
            }
            setFormValue({ ...formValue, title });
          }}
          onChange={(title) => {
            if (!title) {
              setError({ ...error, titleError: "The field should't be empty!" });
            } else if (!props.progress && state.allProgress.findIndex((progress) => progress.title === title) > -1) {
              setError({ ...error, titleError: "The progress already exists!" });
            } else {
              setError({ ...error, titleError: undefined });
            }
            setFormValue({ ...formValue, title });
          }}
          error={error.titleError}
        />
      )}

      <Form.TextField
        id="menubarTitle"
        title="Title In Menu Bar"
        placeholder="Enter the title In Menu Bar"
        value={formValue.menubarTitle}
        onBlur={(event) => {
          const title = event.target.value;
          if (!title) {
            setError({ ...error, menubarTitleError: "The field should't be empty!" });
          } else {
            setError({ ...error, menubarTitleError: undefined });
          }
          setFormValue({ ...formValue, menubarTitle: title });
        }}
        onChange={(title) => {
          if (!title) {
            setError({ ...error, menubarTitleError: "The field should't be empty!" });
          } else {
            setError({ ...error, menubarTitleError: undefined });
          }
          setFormValue({ ...formValue, menubarTitle: title });
        }}
        error={error.menubarTitleError}
      />
      <Form.DatePicker
        id="startDate"
        title="Start Date"
        value={formValue.startDate ? new Date(formValue.startDate) : new Date()}
        onChange={(startDate) => {
          if (!startDate) {
            setError({ ...error, startDateError: "The field should't be empty!" });
          } else if (new Date(startDate).getTime() >= new Date(formValue.endDate).getTime()) {
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
        value={formValue.endDate ? new Date(formValue.endDate) : new Date()}
        onChange={(endDate) => {
          if (!endDate) {
            setError({ ...error, endDateError: "The field should't be empty!" });
          } else if (!formValue.startDate) {
            setError({ ...error, startDateError: "The field should't be empty!", endDateError: undefined });
          } else if (new Date(endDate).getTime() <= new Date(formValue.startDate).getTime()) {
            setError({ ...error, endDateError: "The start date must earlier than end date!" });
          } else {
            setError({ ...error, endDateError: undefined, startDateError: undefined });
          }
          setFormValue({ ...formValue, endDate: endDate as Date });
        }}
        error={error.endDateError}
      />
      <Form.Checkbox
        id="showInMenubar"
        title="Show in Menu Bar"
        label="Yes"
        value={formValue.showInMenubar}
        onChange={(value) => {
          setFormValue({ ...formValue, showInMenubar: value });
        }}
      />
      <Form.Checkbox
        id="showAsCommand"
        title="Show in Command Subtitle"
        label="Yes"
        value={formValue.showAsCommand}
        onChange={(value) => {
          setFormValue({ ...formValue, showAsCommand: value });
        }}
      />
    </Form>
  );
}
