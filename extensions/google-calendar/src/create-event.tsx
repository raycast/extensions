import {
  Action,
  ActionPanel,
  Form,
  Icon,
  LaunchProps,
  LaunchType,
  Toast,
  getPreferenceValues,
  launchCommand,
  open,
  showToast,
} from "@raycast/api";
import { FormValidation, getFavicon, showFailureToast, useCachedState, useForm } from "@raycast/utils";
import { ConferenceProviderActions, useConferenceProviders } from "./conferencing";
import { useCalendar, useGoogleAPIs, withGoogleAPIs } from "./lib/google";
import useCalendars from "./hooks/useCalendars";
import { addSignature, parseAttendeeEmails, parseDurationMs, roundUpTime } from "./lib/utils";
import { buildAllDayDateRange } from "./lib/events";
import { calendar_v3 } from "@googleapis/calendar";
import { useEffect, useMemo } from "react";
import { randomUUID } from "node:crypto";

type FormValues = {
  calendar: string;
  title: string;
  startDate: Date | null;
  endDate: Date | null;
  allDay: boolean;
  duration: string;
  attendees: string | undefined;
  conferencingProvider: string | undefined;
  description: string | undefined;
  sendInvitations: string;
};

const preferences = getPreferenceValues();

function parseDurationAsMinutesForPlainNumbers(value: string | undefined): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmedValue = value.trim();
  if (trimmedValue === "") {
    return undefined;
  }

  return parseDurationMs(trimmedValue) ?? null;
}

function normalizeConferencingValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object" && "link" in value && typeof value.link === "string") {
    return value.link;
  }

  return undefined;
}

function Command(props: LaunchProps<{ launchContext: FormValues }>) {
  const { calendar } = useGoogleAPIs();
  const [lastConferencingProvider, setLastConferencingProvider] = useCachedState<string>(
    "create-event-conferencing",
    "none",
  );

  const { data: calendarsData, isLoading: isLoadingCalendars } = useCalendars();
  const availableCalendars = useMemo(() => {
    const available = [...calendarsData.selected, ...calendarsData.unselected].filter(
      (calendar) => calendar.accessRole === "owner",
    );
    const hasOnePrimary = available.filter((calendar) => calendar.primary).length === 1;
    return available.map((calendar) => ({
      id: hasOnePrimary && calendar.primary ? "primary" : calendar.id!,
      title:
        hasOnePrimary && calendar.primary
          ? `Primary${calendar.summary ? ` (${calendar.summary})` : ""}`
          : (calendar.summaryOverride ?? calendar.summary ?? "-- Unknown --"),
    }));
  }, [calendarsData]);

  const [conferencingProviders] = useConferenceProviders();
  const { focus, handleSubmit, itemProps, reset, setValue, values } = useForm<FormValues>({
    initialValues: {
      calendar: props.launchContext?.calendar ?? "primary",
      title: props.launchContext?.title ?? "",
      startDate: props.launchContext?.startDate ?? roundUpTime(),
      endDate: undefined,
      allDay: false,
      duration: props.launchContext?.duration ?? `${preferences.defaultEventDuration}min`,
      attendees: props.launchContext?.attendees,
      conferencingProvider:
        normalizeConferencingValue(props.launchContext?.conferencingProvider ?? lastConferencingProvider) ?? "none",
      description: props.launchContext?.description,
      sendInvitations: props.launchContext?.sendInvitations ?? preferences.sendInvitations,
    },
    validation: {
      title: FormValidation.Required,
      startDate: FormValidation.Required,
      duration: (value) => {
        if (!value) return undefined; // allow empty, revert to default onSubmit
        const milliseconds = parseDurationAsMinutesForPlainNumbers(value);
        if (milliseconds === undefined || milliseconds === null) {
          return "Invalid format. Examples: 30, 45m, 1h, 1h30m";
        }
        if (milliseconds <= 0) {
          return "Duration must be positive.";
        }
      },
    },
    onSubmit: async (values) => {
      await showToast({ style: Toast.Style.Animated, title: "Creating event" });

      const calendarId = values.calendar ?? "primary";
      const startDate = values.startDate;
      if (!startDate) {
        return;
      }
      const parsedMilliseconds = values.duration
        ? parseDurationAsMinutesForPlainNumbers(values.duration)
        : Number(preferences.defaultEventDuration) * 60 * 1000;
      if (
        !values.allDay &&
        (parsedMilliseconds === undefined || parsedMilliseconds === null || parsedMilliseconds <= 0)
      ) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid Duration",
          message: `Could not parse duration: "${values.duration}". Please use formats like "30", "30min", "1h", or "1h30m".`,
        });
        return;
      }

      const { emails: attendeeEmails, invalidEntries } = parseAttendeeEmails(values.attendees);
      if (invalidEntries.length > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid Guest Email",
          message: `Please check: ${invalidEntries.join(", ")}`,
        });
        return;
      }

      const resetForm = () => {
        focus("title");
        reset();
      };

      setLastConferencingProvider(values.conferencingProvider ?? "none");

      try {
        const schedule = values.allDay
          ? buildAllDayDateRange(startDate, values.endDate ?? undefined)
          : {
              start: { dateTime: startDate.toISOString() },
              end: { dateTime: new Date(startDate.getTime() + parsedMilliseconds!).toISOString() },
            };
        const requestBody: calendar_v3.Schema$Event = {
          summary: values.title,
          description: addSignature(values.description),
          ...schedule,
          attendees: attendeeEmails.length > 0 ? attendeeEmails.map((email) => ({ email })) : undefined,
          location:
            values.conferencingProvider === "none" || values.conferencingProvider === "hangoutsMeet"
              ? undefined
              : values.conferencingProvider,
          conferenceData:
            values.conferencingProvider === "hangoutsMeet"
              ? {
                  createRequest: {
                    conferenceSolutionKey: {
                      type: "hangoutsMeet",
                    },
                    requestId: randomUUID(),
                  },
                }
              : undefined,
        };
        const event = await calendar.events.insert({
          calendarId,
          requestBody,
          conferenceDataVersion: values.conferencingProvider === "hangoutsMeet" ? 1 : undefined,
          sendUpdates: values.sendInvitations as "all" | "externalOnly" | "none",
        });

        resetForm();

        await showToast({
          title: "Created event",
          primaryAction: event.data.htmlLink
            ? {
                title: "Open in Google Calendar",
                shortcut: { modifiers: ["cmd", "shift"], key: "o" },
                onAction: async () => {
                  await open(event.data.htmlLink!);
                },
              }
            : undefined,
          secondaryAction: event.data.id
            ? {
                title: "Delete Event",
                shortcut: { modifiers: ["cmd", "shift"], key: "d" },
                onAction: async (toast) => {
                  await toast.hide();

                  await showToast({ style: Toast.Style.Animated, title: "Deleting event" });

                  try {
                    await calendar.events.delete({ calendarId, eventId: event.data.id! });
                    await showToast({ style: Toast.Style.Success, title: "Deleted event" });
                  } catch (error) {
                    await showFailureToast(error, { title: "Failed deleting event" });
                  }
                },
              }
            : undefined,
        });
      } catch (error) {
        await showFailureToast(error, { title: "Failed to create event" });
      }
    },
  });

  const calendarId = values.calendar ?? "primary";
  const { data: calendarData, isLoading } = useCalendar(calendarId);

  useEffect(() => {
    if (isLoadingCalendars || availableCalendars.length === 0) {
      return;
    }

    const currentCalendar = values.calendar ?? "primary";
    if (availableCalendars.some((calendar) => calendar.id === currentCalendar)) {
      return;
    }

    const fallback = availableCalendars.find((calendar) => calendar.id === "primary")?.id ?? availableCalendars[0]?.id;
    if (fallback) {
      setValue("calendar", fallback);
    }
  }, [availableCalendars, isLoadingCalendars, setValue, values.calendar]);

  const conferencingItemProps = {
    ...itemProps.conferencingProvider,
    onChange: (value: string) => {
      setLastConferencingProvider(value);
      itemProps.conferencingProvider?.onChange?.(value);
    },
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Calendar} title="Create Event" onSubmit={handleSubmit} />
          <ConferenceProviderActions />
        </ActionPanel>
      }
    >
      {!isLoadingCalendars && (
        <Form.Dropdown title="Calendar" {...itemProps.calendar}>
          {availableCalendars.map((calendar) => (
            <Form.Dropdown.Item key={calendar.id} value={calendar.id} title={calendar.title} />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextField title="Title" placeholder="Event title..." {...itemProps.title} />
      <Form.Checkbox
        label="All-day"
        info="Create a date-only event. The end date is inclusive."
        {...itemProps.allDay}
      />
      <Form.DatePicker
        title={values.allDay ? "Start Date" : "Start Date and Time"}
        min={new Date()}
        type={values.allDay ? Form.DatePicker.Type.Date : Form.DatePicker.Type.DateTime}
        {...itemProps.startDate}
      />
      {values.allDay ? (
        <Form.DatePicker
          title="End Date"
          info="Optional. Leave empty for a single-day event."
          min={values.startDate ?? new Date()}
          type={Form.DatePicker.Type.Date}
          {...itemProps.endDate}
        />
      ) : (
        <Form.TextField
          title="Duration"
          placeholder="30min, 1h, 1h30m, ..."
          info="Defaults to minutes without specified unit. Valid examples: 30, 45m, 1h, 1h30m."
          storeValue
          {...itemProps.duration}
        />
      )}
      <Form.TextField
        title="Guests"
        placeholder="Event guests..."
        info="Comma seperated list of email addresses"
        {...itemProps.attendees}
      />
      <Form.Dropdown
        title="Conferencing"
        info={conferencingProviders.length === 0 ? 'Press "⌘ + N" to create a conference provider' : undefined}
        {...conferencingItemProps}
      >
        <Form.Dropdown.Section>
          <Form.Dropdown.Item icon={Icon.CircleDisabled} title="None" value="none" />
          {calendarData?.data.conferenceProperties?.allowedConferenceSolutionTypes?.map((type) => (
            <Form.Dropdown.Item
              key={type}
              icon={getConferenceSolutionIcon(type)}
              title={getConferenceSolutionTitle(type)}
              value={type}
            />
          ))}
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title="Custom">
          {conferencingProviders.map((provider) => (
            <Form.Dropdown.Item
              key={`${provider.name}-${provider.link}`}
              icon={getFavicon(provider.link)}
              title={provider.name}
              value={provider.link}
            />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>
      <Form.Dropdown
        title="Send Invitations"
        info="Send email invitations (including meeting links) to guests"
        {...itemProps.sendInvitations}
      >
        <Form.Dropdown.Item title="All Guests" value="all" />
        <Form.Dropdown.Item title="External Guests Only" value="externalOnly" />
        <Form.Dropdown.Item title="None" value="none" />
      </Form.Dropdown>
      <Form.TextArea title="Description" placeholder="Event description..." {...itemProps.description} />
    </Form>
  );
}

function getConferenceSolutionTitle(type: string) {
  switch (type) {
    case "hangoutsMeet":
      return "Google Meet";
    default:
      return type;
  }
}

function getConferenceSolutionIcon(type: string) {
  switch (type) {
    case "hangoutsMeet":
      return "meet.png";
    default:
      return Icon.Circle;
  }
}
export async function launchCreateEventCommand(context?: FormValues) {
  await launchCommand({ name: "create-event", type: LaunchType.UserInitiated, context });
}

export default withGoogleAPIs(Command);
