import { Action, ActionPanel, Form, Icon, Toast, getPreferenceValues, open, showToast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useGoogleAPIs, withGoogleAPIs } from "./lib/google";
import { buildAllDayDateRange } from "./lib/events";
import { parseQuickEventInput, type QuickEventParseResult } from "./lib/quick-event";
import { calendar_v3 } from "@googleapis/calendar";
import { useEffect, useState } from "react";
import { format, formatRelative } from "date-fns";

type FormValues = {
  input: string;
};

const preferences = getPreferenceValues();

function Command() {
  const { calendar } = useGoogleAPIs();

  const { handleSubmit, reset, itemProps, values } = useForm<FormValues>({
    initialValues: { input: "" },
    validation: {
      input: FormValidation.Required,
    },
    onSubmit: async () => {
      if (parsed.input !== values.input) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Parsing...",
        });
        return;
      }
      if (parsed.error || !parsed.startTime) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid input",
          message: parsed.error,
        });
        return;
      }

      await showToast({ style: Toast.Style.Animated, title: "Creating event" });

      const startTime = parsed.startTime;
      const defaultDuration = preferences.defaultEventDuration;
      const durationMs = (defaultDuration ? Number(defaultDuration) : 15) * 60 * 1000;
      try {
        const schedule = parsed.allDay
          ? buildAllDayDateRange(startTime, parsed.endTime)
          : {
              start: { dateTime: startTime.toISOString() },
              end: { dateTime: new Date(startTime.getTime() + durationMs).toISOString() },
            };
        const requestBody: calendar_v3.Schema$Event = {
          summary: parsed.title,
          ...schedule,
        };
        const event = await calendar.events.insert({
          calendarId: "primary",
          requestBody,
        });

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
        });
        reset();
      } catch {
        await showToast({ style: Toast.Style.Failure, title: "Failed to create event" });
      }
    },
  });

  const [parsed, setParsed] = useState<QuickEventParseResult>({
    title: "",
    startTime: undefined,
    input: "",
  });
  useEffect(() => {
    const timeout = setTimeout(() => {
      setParsed(parseQuickEventInput(values.input));
    }, 200);
    return () => clearTimeout(timeout);
  }, [values.input]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Calendar} title="Create Quick Event" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Title and Date/Time"
        placeholder="Team meeting tomorrow at 3pm, Vacation tomorrow, Offsite Aug 3 all day"
        {...itemProps.input}
      />
      <Form.Description title="Parsed error" text={parsed.error || " "} />
      <Form.Description
        title="Preview"
        text={`${parsed.title || ""} \n${
          parsed.startTime
            ? parsed.allDay
              ? `All day: ${format(parsed.startTime, "PPP")}${
                  parsed.endTime ? ` – ${format(parsed.endTime, "PPP")}` : ""
                }`
              : `${formatRelative(parsed.startTime, new Date())} (${format(parsed.startTime, "PPPp")})`
            : ""
        }`}
      />
    </Form>
  );
}

export default withGoogleAPIs(Command);
