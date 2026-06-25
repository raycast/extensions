import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { useMemo } from "react";
import { createBusyCalTask } from "./busycal-automation";
import { buildBusyCalTaskInput } from "./busycal-form-submission";
import { resolveBusyCalInstallation } from "./busycal-installation";
import { useBusyCalCalendars, useBusyCalInstallation } from "./busycal-hooks";
import { TaskFormValues } from "./types";

/**
 * Raycast command entry point for structured BusyCal task creation.
 */
export default function CreateTaskCommand() {
  const {
    data: installation,
    error: installationError,
    isLoading: isLoadingInstallation,
  } = useBusyCalInstallation();
  const {
    data: calendars,
    error: calendarsError,
    isLoading: isLoadingCalendars,
  } = useBusyCalCalendars(installation, "task");
  const isLoading = isLoadingInstallation || isLoadingCalendars;
  const errorMessage = calendarsError?.message ?? installationError?.message;
  const { handleSubmit, itemProps } = useForm<TaskFormValues>({
    initialValues: {
      title: "",
      calendarID: "",
      hasDueDate: true,
      dueDate: new Date(),
      notes: "",
    },
    validation: {
      title: FormValidation.Required,
    },
    async onSubmit(values) {
      try {
        const activeInstallation =
          installation ?? (await resolveBusyCalInstallation());
        const input = buildBusyCalTaskInput(values);

        await createBusyCalTask(activeInstallation, input);

        // The success toast is the visible completion signal because Raycast does
        // not automatically dismiss or navigate away from the form after submit.
        await showToast({
          style: Toast.Style.Success,
          title: "BusyCal task created",
          message: input.title,
        });
      } catch (error) {
        await showFailureToast(error, {
          title: "Could Not Create Task",
        });
      }
    },
  });

  const calendarItems = useMemo(
    () =>
      (calendars ?? []).map((calendar) => (
        <Form.Dropdown.Item
          key={calendar.calendarID}
          value={calendar.calendarID}
          title={calendar.title}
        />
      )),
    [calendars],
  );

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Task"
            icon={Icon.CheckList}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      {errorMessage ? <Form.Description text={errorMessage} /> : null}
      <Form.TextField
        title="Title"
        placeholder="Finish expense report"
        {...itemProps.title}
      />
      <Form.Dropdown title="Task List" {...itemProps.calendarID}>
        <Form.Dropdown.Item value="" title="BusyCal Default Task Calendar" />
        {calendarItems}
      </Form.Dropdown>
      <Form.Checkbox title="" label="Set due date" {...itemProps.hasDueDate} />
      <Form.DatePicker
        id={itemProps.dueDate.id}
        title="Due"
        value={itemProps.dueDate.value}
        error={itemProps.dueDate.error}
        onChange={(newValue) =>
          itemProps.dueDate.onChange?.(
            newValue ?? itemProps.dueDate.value ?? new Date(),
          )
        }
      />
      <Form.TextArea
        title="Notes"
        placeholder="Optional notes"
        {...itemProps.notes}
      />
    </Form>
  );
}
