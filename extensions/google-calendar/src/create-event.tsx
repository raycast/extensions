import { useCalendars, useConfig } from "@/lib/extension";
import { GoogleCalendarClient } from "@/lib/gcal/gcal-api-client";
import { Action, ActionPanel, Form, LaunchProps, Toast, popToRoot, showToast } from "@raycast/api";
import { getAccessToken, withAccessToken } from "@raycast/utils";
import * as chrono from "chrono-node";
import { useMemo, useState } from "react";
import { RaycastGoogleOAuthService } from "./lib/raycast";

const DefaultDurationValues = [15, 30, 45, 60, 90, 120];

interface FormValues {
  eventTitle: string;
  eventDescription: string;
  eventStart: Date;
  eventDuration: number;
  calendarId: string;
}

function Command(props: LaunchProps<{ arguments: Arguments.CreateEvent }>) {
  const { value: config, isLoading: isConfigLoading } = useConfig();
  const { data: calendarsData, isLoading: isCalendarsLoading } = useCalendars();
  const [durationValues, setDurationValues] = useState(DefaultDurationValues);
  const { title: titleFromArguments, eventTime: eventTimeFromArguments, eventDuration: eventDurationFromArguments } = props.arguments;

  const calendars = useMemo(() => {
    if (!calendarsData || !config) {
      return null;
    }
    const filteredCalendars = calendarsData.filter((calendar) => !config?.calendarConfiguration?.[calendar.id]?.disabled);
    const sortedCalendars = filteredCalendars.sort((a, b) => {
      const aDisabled = config?.calendarConfiguration?.[a.id]?.disabled;
      const bDisabled = config?.calendarConfiguration?.[b.id]?.disabled;

      if (aDisabled && !bDisabled) {
        return 1;
      } else if (!aDisabled && bDisabled) {
        return -1;
      } else {
        return a.name.localeCompare(b.name);
      }
    });
    return sortedCalendars;
  }, [calendarsData, config]);

  const isLoading = isCalendarsLoading || isConfigLoading || !calendars;

  return (
    <Form
      isLoading={isLoading}
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={async (values: FormValues) => {
              const apiClient = new GoogleCalendarClient(getAccessToken().token);
              await apiClient.createEvent({
                title: values.eventTitle,
                description: values.eventDescription,
                durationInMinutes: values.eventDuration,
                startTime: values.eventStart,
                calendar: calendars![0],
              });
              await showToast({
                title: "Event created",
                style: Toast.Style.Success,
              });
              popToRoot();
            }}
          />
        </ActionPanel>
      }
    >
      {calendars && config && (
        <>
          <Form.TextField id="eventTitle" title="Event Title" defaultValue={titleFromArguments} />
          <Form.TextArea id="eventDescription" title="Event Description" />
          <Form.DatePicker id="eventStart" title="Event Time" defaultValue={parseDate(eventTimeFromArguments)} />
          <Form.Dropdown
            id="eventDuration"
            title="Event Duration"
            placeholder="Enter time expression such as '30m' or '2h'"
            defaultValue={eventDurationFromArguments ? parseDuration(eventDurationFromArguments).toString() : ""}
            onSearchTextChange={(searchText) => {
              const minutes = parseDuration(searchText);
              if (minutes) {
                if (durationValues.includes(minutes)) {
                  // Item exists - move to top of list.
                  const matchingIndex = durationValues.indexOf(minutes);
                  setDurationValues([minutes, ...durationValues.slice(0, matchingIndex), ...durationValues.slice(matchingIndex + 1)]);
                } else {
                  // Item does not exist - add to top of list.
                  setDurationValues([minutes, ...durationValues]);
                }
              } else {
                setDurationValues(DefaultDurationValues);
              }
            }}
          >
            {durationValues.map((duration) => {
              const formattedDuration = duration > 60 ? `${Math.floor(duration / 60)} hours` : `${duration} minutes`;
              return <Form.Dropdown.Item key={duration} title={formattedDuration} value={duration.toString()} />;
            })}
          </Form.Dropdown>
          <Form.Dropdown id="calendarId" title="Calendar" defaultValue={calendars![0].id}>
            {calendars?.map((calendar) => <Form.Dropdown.Item key={calendar.id} title={calendar.name} value={calendar.id} />)}
          </Form.Dropdown>
        </>
      )}
    </Form>
  );
}

function parseDuration(duration: string): number {
  const groups = duration.match(/^(\d+)([mh])$/);
  if (groups) {
    const durationInMinutes = parseInt(groups[1]);
    const unit = groups[2];
    let minutes = 0;
    if (unit === "m") {
      minutes = durationInMinutes;
    } else if (unit === "h") {
      minutes = durationInMinutes * 60;
    }
    return minutes;
  } else {
    return 0;
  }
}

function parseDate(date: string): Date | null {
  const parsedDate = chrono.parseDate(date);
  return parsedDate ?? null;
}

export default withAccessToken({ authorize: RaycastGoogleOAuthService.authorize })(Command);
