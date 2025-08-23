// @ts-nocheck
import React, { useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import { parse } from "date-fns";
import {
  zonedTimeToUtc,
  utcToZonedTime,
  format as formatTz,
} from "date-fns-tz";

interface FormValues {
  time: string;
  date: Date;
  fromTimezone: string;
  toTimezone: string;
}

const commonTimezones = [
  { name: "UTC", value: "UTC" },
  { name: "Eastern Time (ET)", value: "America/New_York" },
  { name: "Central Time (CT)", value: "America/Chicago" },
  { name: "Mountain Time (MT)", value: "America/Denver" },
  { name: "Pacific Time (PT)", value: "America/Los_Angeles" },
  { name: "London (GMT/BST)", value: "Europe/London" },
  { name: "Paris (CET/CEST)", value: "Europe/Paris" },
  { name: "Tokyo (JST)", value: "Asia/Tokyo" },
  { name: "Sydney (AEST/AEDT)", value: "Australia/Sydney" },
  { name: "Mumbai (IST)", value: "Asia/Kolkata" },
];

export default function ConvertTimezone() {
  const [result, setResult] = useState<string>("");

  // Get user's current timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  function handleSubmit(values: FormValues) {
    try {
      // Parse the time input
      let parsedTime: Date | null = null;
      const trimmedTime = values.time.trim();

      // Handle single or double digit hours with optional AM/PM (e.g., "10", "10 AM", "10 PM")
      if (/^\d{1,2}(\s*(AM|PM|am|pm))?$/.test(trimmedTime)) {
        const match = trimmedTime.match(/^(\d{1,2})(\s*(AM|PM|am|pm))?$/);
        if (match) {
          const hour = parseInt(match[1], 10);
          const period = match[3]?.toUpperCase();

          if (hour >= 1 && hour <= 12) {
            parsedTime = new Date(values.date);
            if (period === "PM" && hour !== 12) {
              parsedTime.setHours(hour + 12, 0, 0, 0);
            } else if (period === "AM" && hour === 12) {
              parsedTime.setHours(0, 0, 0, 0);
            } else if (period === "AM" || period === "PM") {
              parsedTime.setHours(hour, 0, 0, 0);
            } else {
              // No AM/PM specified, assume AM for 1-12
              parsedTime.setHours(hour, 0, 0, 0);
            }
          } else if (hour >= 0 && hour <= 23 && !period) {
            // 24-hour format without AM/PM
            parsedTime = new Date(values.date);
            parsedTime.setHours(hour, 0, 0, 0);
          }
        }
      } else {
        // Try various time formats
        const timeFormats = [
          "HH:mm",
          "h:mm a",
          "H:mm",
          "h a",
          "H",
          "HH:mm:ss",
          "h:mm:ss a",
        ];

        for (const timeFormat of timeFormats) {
          try {
            parsedTime = parse(trimmedTime, timeFormat, values.date);
            break;
          } catch {
            continue;
          }
        }
      }

      if (!parsedTime) {
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid time format",
          message:
            "Please use formats like '1', '10 AM', '10 PM', '14', '2:30 PM', or '14:30'",
        });
        return;
      }

      // Convert timezone
      const utcTime = zonedTimeToUtc(parsedTime, values.fromTimezone);
      const convertedTime = utcToZonedTime(utcTime, values.toTimezone);

      const formattedResult = formatTz(convertedTime, "PPP 'at' p (zzz)", {
        timeZone: values.toTimezone,
      });

      setResult(formattedResult);

      showToast({
        style: Toast.Style.Success,
        title: "Conversion successful",
        message: formattedResult,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Conversion failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    // @ts-ignore
    <Form
      // @ts-ignore
      actions={
        // @ts-ignore
        <ActionPanel>
          <Action.SubmitForm title="Convert Time" onSubmit={handleSubmit} />
          {result && (
            <Action
              title="Copy Result"
              onAction={() => Clipboard.copy(result)}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="time"
        title="Time"
        placeholder="e.g., 1, 10 AM, 10 PM, 14, 2:30 PM"
        info="Enter hour with optional AM/PM or time in various formats"
      />

      <Form.DatePicker id="date" title="Date" defaultValue={new Date()} />

      <Form.Dropdown
        id="fromTimezone"
        title="From Timezone"
        defaultValue={userTimezone}
      >
        {/* Add user's current timezone if not in common list */}
        {!commonTimezones.some((tz) => tz.value === userTimezone) && (
          <Form.Dropdown.Item
            key={userTimezone}
            value={userTimezone}
            title={`🏠 ${userTimezone} (Current)`}
          />
        )}
        {commonTimezones.map((tz) => (
          <Form.Dropdown.Item
            key={tz.value}
            value={tz.value}
            title={
              tz.value === userTimezone ? `🏠 ${tz.name} (Current)` : tz.name
            }
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="toTimezone"
        title="To Timezone"
        defaultValue="America/New_York"
      >
        {commonTimezones.map((tz) => (
          <Form.Dropdown.Item key={tz.value} value={tz.value} title={tz.name} />
        ))}
      </Form.Dropdown>

      {result && <Form.Description title="Result" text={result} />}
    </Form>
  );
}
