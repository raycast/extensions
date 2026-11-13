import { Action, ActionPanel, Form, Icon, Toast, open, showToast, useNavigation } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";

import { isFullDay, parseReminderDueDate } from "../helpers";
import { createCalendarEvent, getCalendarNames } from "../helpers/calendar";
import { Reminder } from "../hooks/useData";

type CreateCalendarEventProps = {
  reminder: Reminder;
};

type FormValues = {
  title: string;
  calendarName: string;
  startDate: Date | null;
  endDate: Date | null;
  isAllDay: boolean;
  location: string;
  notes: string;
  includeReminderLink: boolean;
};

export default function CreateCalendarEvent({ reminder }: CreateCalendarEventProps) {
  const { pop } = useNavigation();
  const { data: calendars = [], isLoading: isLoadingCalendars } = useCachedPromise(getCalendarNames, []);

  const reminderIsFullDay = reminder.dueDate ? isFullDay(reminder.dueDate) : false;
  const initialStartDate = parseReminderDueDate(reminder.dueDate) ?? new Date();
  const initialEndDate = reminderIsFullDay ? initialStartDate : new Date(initialStartDate.getTime() + 30 * 60 * 1000);

  const { handleSubmit, itemProps, values, setValue } = useForm<FormValues>({
    initialValues: {
      title: reminder.title,
      calendarName: calendars[0] ?? "",
      startDate: initialStartDate,
      endDate: initialEndDate,
      isAllDay: reminderIsFullDay,
      location: reminder.location?.address ?? "",
      notes: reminder.notes ?? "",
      includeReminderLink: true,
    },
    validation: {
      title: FormValidation.Required,
      startDate: FormValidation.Required,
      endDate: (val) => {
        if (!val) {
          return "End date is required";
        }
        if (values.startDate) {
          if (values.isAllDay) {
            if (val < values.startDate) {
              return "End date cannot be earlier than start date";
            }
          } else {
            if (val <= values.startDate) {
              return "End date must be after start date";
            }
          }
        }
      },
    },
    async onSubmit(formValues) {
      if (!formValues.startDate || !formValues.endDate) {
        return;
      }

      try {
        await showToast({ style: Toast.Style.Animated, title: "Creating calendar event..." });

        await createCalendarEvent({
          calendarName: formValues.calendarName || calendars[0] || undefined,
          title: formValues.title,
          startDate: formValues.startDate,
          endDate: formValues.endDate,
          isAllDay: formValues.isAllDay,
          notes: formValues.notes || undefined,
          location: formValues.location || undefined,
          url: formValues.includeReminderLink ? reminder.openUrl : undefined,
        });

        await showToast({
          style: Toast.Style.Success,
          title: "Created Calendar Event",
          message: formValues.title,
          primaryAction: {
            title: "Open Calendar",
            onAction: async () => {
              await open("ical://");
            },
          },
        });

        pop();
      } catch (error) {
        console.error(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Unable to create calendar event",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });

  return (
    <Form
      isLoading={isLoadingCalendars}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Event" icon={Icon.Calendar} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.title} title="Event Title" placeholder="Meeting / Task Title" />

      {calendars.length > 0 && (
        <Form.Dropdown {...itemProps.calendarName} value={values.calendarName || calendars[0]} title="Calendar">
          {calendars.map((calName) => (
            <Form.Dropdown.Item key={calName} title={calName} value={calName} />
          ))}
        </Form.Dropdown>
      )}

      <Form.Checkbox
        {...itemProps.isAllDay}
        label="All-Day Event"
        onChange={(checked) => {
          setValue("isAllDay", checked);
          if (checked) {
            if (values.startDate) {
              setValue("endDate", values.startDate);
            }
          } else {
            if (values.startDate) {
              setValue("endDate", new Date(values.startDate.getTime() + 30 * 60 * 1000));
            }
          }
        }}
      />

      <Form.DatePicker
        {...itemProps.startDate}
        title="Start Date"
        type={values.isAllDay ? Form.DatePicker.Type.Date : Form.DatePicker.Type.DateTime}
        onChange={(newDate) => {
          setValue("startDate", newDate);
          if (newDate) {
            if (values.isAllDay) {
              setValue("endDate", newDate);
            } else if (values.endDate && values.endDate <= newDate) {
              setValue("endDate", new Date(newDate.getTime() + 30 * 60 * 1000));
            }
          }
        }}
      />

      <Form.DatePicker
        {...itemProps.endDate}
        title="End Date"
        type={values.isAllDay ? Form.DatePicker.Type.Date : Form.DatePicker.Type.DateTime}
      />

      <Form.TextField {...itemProps.location} title="Location" placeholder="Office, Room, or URL" />

      <Form.TextArea {...itemProps.notes} title="Notes" placeholder="Additional details..." />

      <Form.Checkbox
        {...itemProps.includeReminderLink}
        label="Attach 1-Click Reminder URL to Event"
        info="Stores reminder deep link (x-apple-reminderkit://) on the calendar event for quick reference."
      />
    </Form>
  );
}
