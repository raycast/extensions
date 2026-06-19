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

const preferences = getPreferenceValues();

type ParseInputReturn = {
  title?: string;
  startTime?: Date;
  error?: string;
  input: string;
};

function parseInput(input: string): ParseInputReturn {
  if (!input.trim()) {
    return { input };
  }
  const results = chrono.parse(input);
  if (results.length === 0) {
    return { input, title: input, error: `No time detected – try adding "at 3pm"` };
  }

  const title = input.replace(results[0].text, "").trim();
  const startTime = results[0].start.date();

  if (title === "") {
    return { input, error: "Title cannot be empty" };
  }

  return { input, title, startTime };
}

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
    input: "",
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
      <Form.Description title="Parsed error" text={parsed.error || " "} />
      <Form.Description
        title="Preview"
        text={`${parsed.title || ""} \n${
          parsed.startTime
            ? `${formatRelative(parsed.startTime, new Date())} (${format(parsed.startTime, "PPPp")})`
            : ""
        }`}
      />
    </Form>
  );
}

export default withGoogleAPIs(Command);
