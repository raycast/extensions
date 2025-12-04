import {
  Toast,
  showToast,
  Action,
  ActionPanel,
  Form,
  Icon,
  getPreferenceValues,
  LaunchProps,
  LocalStorage,
  popToRoot,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, useRef } from "react";
import client from "./helpers/client";
import getErrorHandler from "./helpers/getErrorHandler";

interface Values {
  areaIDField: string;
  nameField: string;
  noteField: string;
  statusField: string;
  priorityField: string;
  dateField: Date;
}

interface FieldRefs {
  nameFieldRef: React.RefObject<Form.TextField>;
  noteFieldRef: React.RefObject<Form.TextArea>;
  dateFieldRef: React.RefObject<Form.DatePicker>;
}

async function createTask(values: Values, fieldRefs: FieldRefs) {
  const { defaultAreaId } = getPreferenceValues();

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Creating task...",
  });

  try {
    const res = await client.post("tasks", {
      name: values.nameField,
      note: values.noteField,
      status: values.statusField,
      priority: values.priorityField,
      scheduled_on: values.dateField,
      area_id: values.areaIDField ?? defaultAreaId,
    });

    // The promise won't be rejected in case of HTTP 4xx or 5xx server responses, so we need to handle them manually
    if (res.status >= 400) {
      toast.style = Toast.Style.Failure;

      const { title, message } = getErrorHandler(res.status);

      toast.title = title;
      toast.message = message;
    } else {
      // Clear all fields
      Object.values(fieldRefs).forEach((ref) => ref.current?.reset());

      // Focus back on the first field
      fieldRefs.nameFieldRef.current?.focus();

      toast.style = Toast.Style.Success;
      toast.title = "Task created!";
    }
  } catch (error) {
    const { message } = error as Error;

    toast.style = Toast.Style.Failure;
    toast.title = "Error creating task.";
    toast.message = message;
  }
}

export default function Command(props: LaunchProps<{ draftValues: Values }>) {
  const { draftValues } = props ?? {};

  const [nameError, setNameError] = useState<string | undefined>();

  const nameFieldRef = useRef<Form.TextField>(null);
  const noteFieldRef = useRef<Form.TextArea>(null);
  const dateFieldRef = useRef<Form.DatePicker>(null);

  const { defaultAreaId } = getPreferenceValues();

  const { isLoading, data } = usePromise(async () => {
    const allAreas = await LocalStorage.allItems();
    return allAreas;
  });

  const fieldRefs = { nameFieldRef, noteFieldRef, dateFieldRef };

  function dropNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add New Task"
            onSubmit={(values: Values) => {
              createTask(values, fieldRefs);

              // Pop to root if the user is resuming a draft; otherwise the values persist in the form and a new draft is created upon going back to the root manually
              if (props.draftValues) {
                popToRoot();
              }
            }}
            icon={Icon.Plus}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="nameField"
        title="Name"
        placeholder="New task..."
        defaultValue={draftValues?.nameField}
        error={nameError}
        onChange={dropNameErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setNameError("The field should't be empty!");
          } else {
            dropNameErrorIfNeeded();
          }
        }}
        ref={nameFieldRef}
        autoFocus
      />
      <Form.TextArea
        id="noteField"
        title="Note"
        placeholder="Add an optional description to your task"
        info="Try using Markdown or formatting shortcuts (e.g., CMD + B) here!"
        defaultValue={draftValues?.noteField}
        ref={noteFieldRef}
        enableMarkdown
      />
      {Object.values(data ?? {}).length ? (
        <Form.Dropdown
          id="areaIDField"
          title="Area"
          defaultValue={draftValues?.areaIDField ?? defaultAreaId}
          isLoading={isLoading}
        >
          <Form.Dropdown.Item value={defaultAreaId} title="Default Area" />
          {Object.entries(data ?? {}).map(([name, id]) => (
            <Form.Dropdown.Item value={id} title={name} key={id} />
          ))}
        </Form.Dropdown>
      ) : null}
      <Form.Dropdown id="statusField" title="Status" defaultValue={draftValues?.statusField ?? "later"}>
        <Form.Dropdown.Item value="later" title="Later" />
        <Form.Dropdown.Item value="next" title="Next" />
        <Form.Dropdown.Item value="started" title="Started" />
        <Form.Dropdown.Item value="waiting" title="Waiting" />
        <Form.Dropdown.Item value="completed" title="Completed" />
      </Form.Dropdown>
      <Form.Dropdown id="priorityField" title="Priority" defaultValue={draftValues?.priorityField ?? "0"}>
        <Form.Dropdown.Item value="2" title="Highest" />
        <Form.Dropdown.Item value="1" title="High" />
        <Form.Dropdown.Item value="0" title="Normal" />
        <Form.Dropdown.Item value="-1" title="Low" />
        <Form.Dropdown.Item value="-2" title="Lowest" />
      </Form.Dropdown>
      <Form.DatePicker id="dateField" title="Scheduled For" defaultValue={draftValues?.dateField} ref={dateFieldRef} />
    </Form>
  );
}
