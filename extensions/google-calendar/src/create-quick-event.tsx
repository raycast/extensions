import { Action, ActionPanel, Form, Icon, Toast, getPreferenceValues, open, showToast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useGoogleAPIs, withGoogleAPIs } from "./lib/google";
import { calendar_v3 } from "@googleapis/calendar";
import { useEffect, useState } from "react";
import { format, formatRelative } from "date-fns";
import * as chrono from "chrono-node";

type FormValues = {
  input: string;
};

const preferences: Preferences.CreateEvent = getPreferenceValues();

type ParseInputReturn = {
  title?: string;
  startTime?: Date;
  titleError?: string;
  startTimeError?: string;
};

function parseInput(input: string): ParseInputReturn {
  const trimmed = input.trim();
  if (!trimmed) {
    return {};
  }
  const results = chrono.parse(input);
  if (results.length === 0) {
    return { title: input, startTimeError: `No time detected – try adding “at 3pm”` };
  }

  const title = trimmed.replace(results[0].text, "");
  const startTime = results[0].start.date();
  const titleError = (title || "").trim() === "" ? "Title cannot be empty" : "";

  return { title, titleError, startTime };
}

function Command() {
  const { calendar } = useGoogleAPIs();

  const { handleSubmit, reset, itemProps, values } = useForm<FormValues>({
    initialValues: { input: "" },
    validation: {
      input: FormValidation.Required,
    },
    onSubmit: async () => {
      if (parsed.titleError || !parsed.startTime || parsed.startTimeError) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid input",
          message: parsed.titleError || parsed.startTimeError,
        });
        return;
      }

      await showToast({ style: Toast.Style.Animated, title: "Creating event" });

      const startTime = parsed.startTime;
      const durationMs = Number(preferences.defaultEventDuration) * 60 * 1000;

      const requestBody: calendar_v3.Schema$Event = {
        summary: parsed.title,
        start: {
          dateTime: startTime.toISOString(),
        },
        end: {
          dateTime: new Date(startTime.getTime() + durationMs).toISOString(),
        },
      };

      try {
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

  const [parsed, setParsed] = useState<ParseInputReturn>({
    title: "",
    startTime: undefined,
  });
  useEffect(() => {
    const timeout = setTimeout(() => {
      setParsed(parseInput(values.input));
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
        placeholder="Team meeting tomorrow at 3pm, 10/01 14:30, next Mon 9am"
        {...itemProps.input}
      />
      <Form.Description
        title="Preview Event"
        text={`${parsed.titleError || parsed.title || ""} \n${
          parsed.startTime
            ? `${formatRelative(parsed.startTime, new Date())} (${format(parsed.startTime, "PPPp")})`
            : (parsed.startTimeError ?? "")
        }`}
      />
    </Form>
  );
}

export default withGoogleAPIs(Command);
