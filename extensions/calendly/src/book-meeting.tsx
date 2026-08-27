import { Action, ActionPanel, Alert, Form, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm, withAccessToken } from "@raycast/utils";

import { getEventType, listAvailableTimes, listEventTypes } from "./api/event-types";
import { bookMeeting } from "./api/meetings";
import { endOfRange, formatDateTime, isValidTimezone, localTimezone, timezones } from "./lib/dates";
import {
  locationDetailPlaceholder,
  locationDetailTitle,
  locationNeedsInviteeDetails,
  locationTitle,
  locationWithInviteeDetails,
} from "./lib/locations";
import { calendlyOAuth } from "./oauth/calendly";

interface Values {
  eventTypeUri: string;
  name: string;
  email: string;
  timezone: string;
  startTime: string;
  locationIndex: string;
  locationDetails: string;
}

export function BookMeetingForm({ eventTypeUri }: { eventTypeUri?: string }) {
  const { pop } = useNavigation();
  const { data: eventTypes = [], isLoading: isLoadingEventTypes } = useCachedPromise(listEventTypes, []);
  const { handleSubmit, itemProps, setValue, values } = useForm<Values>({
    initialValues: {
      eventTypeUri: eventTypeUri ?? "",
      name: "",
      email: "",
      timezone: localTimezone(),
      startTime: "",
      locationIndex: "0",
      locationDetails: "",
    },
    validation: {
      eventTypeUri: FormValidation.Required,
      name: FormValidation.Required,
      email(value) {
        if (!value) return "Invitee email is required";
        if (!/^\S+@\S+\.\S+$/.test(value)) return "Enter a valid email address";
      },
      timezone(value) {
        if (!value) return "Invitee timezone is required";
        if (!isValidTimezone(value)) return "Enter a valid IANA timezone";
      },
      startTime: FormValidation.Required,
    },
    async onSubmit(formValues) {
      try {
        const selectedEventType = await getEventType(formValues.eventTypeUri);
        const selectedLocation = selectedEventType.locations[Number(formValues.locationIndex)];
        const location = selectedLocation
          ? locationWithInviteeDetails(selectedLocation, formValues.locationDetails)
          : undefined;
        if (selectedLocation && locationNeedsInviteeDetails(selectedLocation) && !formValues.locationDetails?.trim()) {
          await showToast({
            style: Toast.Style.Failure,
            title:
              selectedLocation.kind === "outbound_call" ? "Phone number is required" : "Location details are required",
            message:
              selectedLocation.kind === "outbound_call"
                ? "Enter the invitee's phone number for this location."
                : "Enter the location details required for this meeting.",
          });
          return;
        }
        const chosenTime = new Date(formValues.startTime);
        if (chosenTime.getTime() <= Date.now() + 60_000) {
          throw new Error("That time is no longer far enough in the future. Choose another slot and try again.");
        }
        const verificationStart = new Date(chosenTime.getTime() - 60_000);
        const verificationEnd = new Date(chosenTime.getTime() + Math.max(selectedEventType.duration, 1) * 60_000);
        const currentTimes = await listAvailableTimes(selectedEventType.uri, verificationStart, verificationEnd);
        if (!currentTimes.some((time) => time.status === "available" && time.start_time === formValues.startTime)) {
          throw new Error("That time is no longer available. Choose another slot and try again.");
        }

        const confirmed = await confirmAlert({
          title: `Book ${selectedEventType.name}?`,
          message: `${formValues.name} at ${formatDateTime(formValues.startTime)} (${formValues.timezone})`,
          primaryAction: { title: "Book Meeting", style: Alert.ActionStyle.Default },
        });
        if (!confirmed) return;

        const toast = await showToast(Toast.Style.Animated, "Booking meeting…");
        try {
          await bookMeeting({
            eventTypeUri: selectedEventType.uri,
            startTime: formValues.startTime,
            name: formValues.name,
            email: formValues.email,
            timezone: formValues.timezone,
            location,
          });
          toast.style = Toast.Style.Success;
          toast.title = "Meeting booked";
          toast.message = `${formValues.name} · ${formatDateTime(formValues.startTime)}`;
          pop();
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = "Could not book meeting";
          toast.message = error instanceof Error ? error.message : String(error);
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not verify availability",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });

  const selectedEventType = eventTypes.find((eventType) => eventType.uri === values.eventTypeUri);
  const selectedLocation = selectedEventType?.locations[Number(values.locationIndex)];
  const { data: availableTimes = [], isLoading: isLoadingTimes } = useCachedPromise(
    async (selectedUri) => {
      if (!selectedUri) return [];
      const start = new Date();
      return listAvailableTimes(selectedUri, start, endOfRange(start, 7));
    },
    [values.eventTypeUri],
  );

  return (
    <Form
      isLoading={isLoadingEventTypes || isLoadingTimes}
      navigationTitle="Book Meeting"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Book Meeting" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        title="Event Type"
        {...itemProps.eventTypeUri}
        onChange={(value) => {
          setValue("eventTypeUri", value);
          setValue("startTime", "");
          setValue("locationIndex", "0");
          setValue("locationDetails", "");
        }}
      >
        {eventTypes.map((eventType) => (
          <Form.Dropdown.Item
            key={eventType.uri}
            value={eventType.uri}
            title={`${eventType.name} · ${eventType.duration} min`}
          />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField title="Invitee Name" placeholder="Sarah Smith" {...itemProps.name} />
      <Form.TextField title="Email" placeholder="sarah@example.com" {...itemProps.email} />
      <Form.Dropdown title="Invitee Timezone" {...itemProps.timezone}>
        {timezones().map((zone) => (
          <Form.Dropdown.Item key={zone} value={zone} title={zone} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Available Time" {...itemProps.startTime}>
        {availableTimes
          .filter((time) => time.status === "available")
          .map((time) => (
            <Form.Dropdown.Item key={time.start_time} value={time.start_time} title={formatDateTime(time.start_time)} />
          ))}
      </Form.Dropdown>
      {selectedEventType && selectedEventType.locations.length > 0 ? (
        <Form.Dropdown
          title="Location"
          {...itemProps.locationIndex}
          onChange={(value) => {
            setValue("locationIndex", value);
            setValue("locationDetails", "");
          }}
        >
          {selectedEventType.locations.map((location, index) => (
            <Form.Dropdown.Item
              key={`${location.kind}-${index}`}
              value={String(index)}
              title={locationTitle(location)}
            />
          ))}
        </Form.Dropdown>
      ) : null}
      {selectedLocation && locationNeedsInviteeDetails(selectedLocation) ? (
        <Form.TextField
          title={locationDetailTitle(selectedLocation)}
          placeholder={locationDetailPlaceholder(selectedLocation)}
          {...itemProps.locationDetails}
        />
      ) : null}
    </Form>
  );
}

function BookMeetingCommand() {
  return <BookMeetingForm />;
}

export default withAccessToken(calendlyOAuth)(BookMeetingCommand);
