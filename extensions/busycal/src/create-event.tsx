import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { useMemo } from "react";
import { createBusyCalEvent } from "./busycal-automation";
import { buildBusyCalEventInput } from "./busycal-form-submission";
import { resolveBusyCalInstallation } from "./busycal-installation";
import { useBusyCalCalendars, useBusyCalInstallation } from "./busycal-hooks";
import { EventFormValues } from "./types";

/**
 * Shared props for the structured event form.
 */
interface CreateEventFormProps {
  initialValues?: Partial<EventFormValues>;
  submitTitle?: string;
  popOnSuccess?: boolean;
}

/**
 * Builds the initial event form state shown to the user.
 */
function initialEventFormValues(
  initialValues?: Partial<EventFormValues>,
): EventFormValues {
  const startDate = initialValues?.startDate ?? new Date();
  const endDate =
    initialValues?.endDate ?? new Date(startDate.getTime() + 60 * 60 * 1000);

  return {
    title: initialValues?.title ?? "",
    calendarID: initialValues?.calendarID ?? "",
    startDate,
    endDate,
    allDay: initialValues?.allDay ?? false,
    location: initialValues?.location ?? "",
    notes: initialValues?.notes ?? "",
  };
}

/**
 * Structured event form shared by the main command and the availability flow.
 *
 * - Parameter props: Optional form defaults and a custom submit title.
 */
export function CreateEventForm(props: CreateEventFormProps) {
  const { pop } = useNavigation();
  const {
    data: installation,
    error: installationError,
    isLoading: isLoadingInstallation,
  } = useBusyCalInstallation();
  const {
    data: calendars,
    error: calendarsError,
    isLoading: isLoadingCalendars,
  } = useBusyCalCalendars(installation, "event");
  const isLoading = isLoadingInstallation || isLoadingCalendars;
  const errorMessage = calendarsError?.message ?? installationError?.message;

  const { handleSubmit, itemProps, values } = useForm<EventFormValues>({
    initialValues: initialEventFormValues(props.initialValues),
    validation: {
      title: FormValidation.Required,
      endDate: (value) => {
        if (!value) {
          return "Choose an event end time.";
        }

        if (value.getTime() < values.startDate.getTime()) {
          return "The event end time must be on or after the start time.";
        }

        return undefined;
      },
    },
    async onSubmit(values) {
      try {
        const activeInstallation =
          installation ?? (await resolveBusyCalInstallation());
        const input = buildBusyCalEventInput(values);

        await createBusyCalEvent(activeInstallation, input);

        // Raycast keeps forms on screen after submit by default. Embedded flows can
        // opt into popping back to the previous screen once the BusyCal mutation completes.
        await showToast({
          style: Toast.Style.Success,
          title: "BusyCal event created",
          message: input.title,
        });

        if (props.popOnSuccess) {
          await pop();
        }
      } catch (error) {
        await showFailureToast(error, {
          title: "Could Not Create Event",
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
            title={props.submitTitle ?? "Create Event"}
            icon={Icon.Calendar}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      {errorMessage ? <Form.Description text={errorMessage} /> : null}
      <Form.TextField
        title="Title"
        placeholder="Team sync"
        {...itemProps.title}
      />
      <Form.Dropdown title="Calendar" {...itemProps.calendarID}>
        <Form.Dropdown.Item value="" title="BusyCal Default Calendar" />
        {calendarItems}
      </Form.Dropdown>
      <Form.DatePicker
        id={itemProps.startDate.id}
        title="Starts"
        value={values.startDate}
        error={itemProps.startDate.error}
        onChange={(newValue) =>
          itemProps.startDate.onChange?.(newValue ?? values.startDate)
        }
      />
      <Form.DatePicker
        id={itemProps.endDate.id}
        title="Ends"
        value={values.endDate}
        error={itemProps.endDate.error}
        onChange={(newValue) =>
          itemProps.endDate.onChange?.(newValue ?? values.endDate)
        }
      />
      <Form.Checkbox title="" label="All-day event" {...itemProps.allDay} />
      <Form.TextField
        title="Location"
        placeholder="Apple Park"
        {...itemProps.location}
      />
      <Form.TextArea
        title="Notes"
        placeholder="Optional notes"
        {...itemProps.notes}
      />
    </Form>
  );
}

/**
 * Raycast command entry point for structured BusyCal event creation.
 */
export default function CreateEventCommand() {
  return <CreateEventForm />;
}
