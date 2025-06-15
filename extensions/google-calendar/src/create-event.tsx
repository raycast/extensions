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
import { FormValidation, getFavicon, showFailureToast, useForm } from "@raycast/utils";
import { ConferenceProviderActions, useConferenceProviders } from "./conferencing";
import { useCalendar, useGoogleAPIs, withGoogleAPIs } from "./lib/google";
import useCalendars from "./hooks/useCalendars";
import { addSignature, roundUpTime } from "./lib/utils";
import { calendar_v3 } from "@googleapis/calendar";
import { useMemo, useState } from "react";
import parse from "parse-duration";

type FormValues = {
  calendar: string;
  title: string;
  startDate: Date | null;
  duration: string;
  attendees: string | undefined;
  conferencingProvider: string | undefined;
  description: string | undefined;
};

const preferences: Preferences.CreateEvent = getPreferenceValues();

function parseDurationAsMinutesForPlainNumbers(value: string | undefined): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmedValue = value.trim();
  if (trimmedValue === "") {
    return undefined;
  }

  const isPlainIntegerString = /^\d+$/.test(trimmedValue);
  if (isPlainIntegerString) {
    return parse(`${trimmedValue}m`);
  } else {
    return parse(trimmedValue);
  }
}

function Command(props: LaunchProps<{ launchContext: FormValues }>) {
  const { calendar } = useGoogleAPIs();
  const [calendarId, setCalendarId] = useState("primary");

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
  const { data: calendarData, isLoading } = useCalendar(calendarId);
  const { focus, handleSubmit, itemProps, reset } = useForm<FormValues>({
    initialValues: {
      calendar: props.launchContext?.calendar ?? "primary",
      title: props.launchContext?.title ?? "",
      startDate: props.launchContext?.startDate ?? roundUpTime(),
      duration: props.launchContext?.duration ?? `${preferences.defaultEventDuration}min`,
      attendees: props.launchContext?.attendees,
      conferencingProvider: props.launchContext?.conferencingProvider,
      description: props.launchContext?.description,
    },
    validation: {
      title: FormValidation.Required,
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
      const startDate = values.startDate ?? new Date();
      const parsedMilliseconds = values.duration
        ? parseDurationAsMinutesForPlainNumbers(values.duration)
        : Number(preferences.defaultEventDuration) * 60 * 1000;
      if (parsedMilliseconds === undefined || parsedMilliseconds === null || parsedMilliseconds <= 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid Duration",
          message: `Could not parse duration: "${values.duration}". Please use formats like "30", "30min", "1h", or "1h30m".`,
        });
        return;
      }

      const requestBody: calendar_v3.Schema$Event = {
        summary: values.title,
        description: addSignature(values.description),
        start: {
          dateTime: startDate.toISOString(),
        },
        end: {
          dateTime: new Date(startDate.getTime() + parsedMilliseconds).toISOString(),
        },
        attendees: values.attendees ? values.attendees.split(",").map((email) => ({ email })) : undefined,
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
                  requestId: values.conferencingProvider,
                },
              }
            : undefined,
      };

      const resetForm = () => {
        setCalendarId("primary");
        focus("title");
        reset();
      };

      try {
        const event = await calendar.events.insert({
          calendarId,
          requestBody,
          conferenceDataVersion: values.conferencingProvider === "hangoutsMeet" ? 1 : undefined,
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

  const calendarItemProps = {
    ...itemProps.calendar,
    onChange: (value: string) => {
      setCalendarId(value);
      itemProps?.calendar?.onChange?.(value);
    },
  };

  return (
    <Form
      isLoading={isLoading || isLoadingCalendars}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Calendar} title="Create Event" onSubmit={handleSubmit} />
          <ConferenceProviderActions />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Calendar" value={calendarId} {...calendarItemProps}>
        {availableCalendars.map((calendar) => (
          <Form.Dropdown.Item key={calendar.id} value={calendar.id} title={calendar.title} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Title" placeholder="Event title..." {...itemProps.title} />
      <Form.DatePicker
        title="Start Date"
        min={new Date()}
        type={Form.DatePicker.Type.DateTime}
        {...itemProps.startDate}
      />
      <Form.TextField
        title="Duration"
        placeholder="30min, 1h, 1h30m, ..."
        info="Defaults to minutes without specified unit. Valid examples: 30, 45m, 1h, 1h30m."
        storeValue
        {...itemProps.duration}
      ></Form.TextField>
      <Form.TextField
        title="Guests"
        placeholder="Event guests..."
        info="Comma seperated list of email addresses"
        {...itemProps.attendees}
      />
      <Form.Dropdown
        title="Conferencing"
        storeValue
        info={conferencingProviders.length === 0 ? 'Press "⌘ + N" to create a conference provider' : undefined}
        {...itemProps.conferencingProvider}
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
