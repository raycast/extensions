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
import { useGoogleAPIs, withGoogleAPIs } from "./google";
import { addSignature, roundUpTime } from "./utils";

type FormValues = {
  title: string;
  startDate: Date | null;
  duration: string;
  attendees: string | undefined;
  conferencingProvider: string | undefined;
  description: string | undefined;
};

const preferences: Preferences.CreateEvent = getPreferenceValues();

function Command(props: LaunchProps<{ launchContext: FormValues }>) {
  const { calendar } = useGoogleAPIs();
  const [conferencingProviders] = useConferenceProviders();
  const { focus, handleSubmit, itemProps, reset } = useForm<FormValues>({
    initialValues: {
      title: props.launchContext?.title ?? "",
      startDate: props.launchContext?.startDate ?? roundUpTime(),
      duration: props.launchContext?.duration ?? preferences.defaultEventDuration,
      attendees: props.launchContext?.attendees,
      conferencingProvider: props.launchContext?.conferencingProvider,
      description: props.launchContext?.description,
    },
    validation: {
      title: FormValidation.Required,
    },
    onSubmit: async (values) => {
      await showToast({ style: Toast.Style.Animated, title: "Creating event" });

      const startDate = values.startDate ?? new Date();
      const requestBody = {
        summary: values.title,
        description: addSignature(values.description),
        start: {
          dateTime: startDate.toISOString(),
        },
        end: {
          dateTime: new Date(startDate.getTime() + parseInt(values.duration) * 60 * 1000).toISOString(),
        },
        attendees: values.attendees ? values.attendees.split(",").map((email) => ({ email })) : undefined,
        location: values.conferencingProvider,
      };

      try {
        const event = await calendar.events.insert({ calendarId: "primary", requestBody });

        focus("title");
        reset();

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
                    await calendar.events.delete({ calendarId: "primary", eventId: event.data.id! });
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

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Calendar} title="Create Event" onSubmit={handleSubmit} />
          <ConferenceProviderActions />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="Event title..." {...itemProps.title} />
      <Form.DatePicker
        title="Start Date"
        min={new Date()}
        type={Form.DatePicker.Type.DateTime}
        {...itemProps.startDate}
      />
      <Form.Dropdown title="Duration" storeValue {...itemProps.duration}>
        <Form.Dropdown.Item value="15" title="15 Minutes" />
        <Form.Dropdown.Item value="30" title="30 Minutes" />
        <Form.Dropdown.Item value="45" title="45 Minutes" />
        <Form.Dropdown.Item value="60" title="1 Hour" />
        <Form.Dropdown.Item value="90" title="1.5 Hours" />
        <Form.Dropdown.Item value="120" title="2 Hours" />
      </Form.Dropdown>
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
        {conferencingProviders.map((provider) => (
          <Form.Dropdown.Item
            key={`${provider.name}-${provider.link}`}
            icon={getFavicon(provider.link)}
            title={provider.name}
            value={provider.link}
          />
        ))}
      </Form.Dropdown>
      <Form.TextArea title="Description" placeholder="Event description..." {...itemProps.description} />
    </Form>
  );
}

export async function launchCreateEventCommand(context?: FormValues) {
  await launchCommand({ name: "create-event", type: LaunchType.UserInitiated, context });
}

export default withGoogleAPIs(Command);
