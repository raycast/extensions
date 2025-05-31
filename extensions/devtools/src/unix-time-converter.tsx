import React, { useState } from "react";
import { ActionPanel, Action, Form } from "@raycast/api";

const TIMEZONES = [
  { id: "local", name: "Local Time" },
  { id: "UTC", name: "UTC" },
  { id: "America/New_York", name: "America/New_York" },
  { id: "Europe/London", name: "Europe/London" },
  { id: "Asia/Tokyo", name: "Asia/Tokyo" },
  { id: "Australia/Sydney", name: "Australia/Sydney" },
];

function getDateInfo(input: string, timeZone: string) {
  let date: Date | null = null;
  let unix: number | null = null;
  let error = "";

  if (/^\d+$/.test(input)) {
    // Input is a Unix timestamp (seconds)
    unix = parseInt(input, 10);
    date = new Date(unix * 1000);
  } else {
    // Try to parse as date string
    const parsed = Date.parse(input);
    if (!isNaN(parsed)) {
      date = new Date(parsed);
      unix = Math.floor(date.getTime() / 1000);
    } else {
      error = "Invalid date or unix time";
    }
  }

  if (!date || isNaN(date.getTime())) {
    error = "Invalid date or unix time";
    return { error };
  }

  const local = timeZone === "local" ? date.toLocaleString() : date.toLocaleString("en-US", { timeZone });
  const utc = date.toISOString();
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime() + (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const weekOfYear = Math.ceil(((date.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  const isLeapYear = date.getFullYear() % 4 === 0 && (date.getFullYear() % 100 !== 0 || date.getFullYear() % 400 === 0);

  return {
    local,
    utc,
    unix,
    dayOfYear,
    weekOfYear,
    isLeapYear,
    error: "",
  };
}

export default function Command() {
  // Initialize input with current Unix timestamp
  const [input, setInput] = useState(Math.floor(Date.now() / 1000).toString());
  const [timezone, setTimezone] = useState("local");
  const info = getDateInfo(input, timezone);

  return (
    <Form
      actions={
        info && !info.error ? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Unix Time" content={info.unix?.toString() || ""} />
            <Action.CopyToClipboard
              title={`Copy Time (${TIMEZONES.find((z) => z.id === timezone)?.name})`}
              content={info.local || ""}
            />
            <Action.CopyToClipboard title="Copy UTC Time" content={info.utc || ""} />
          </ActionPanel>
        ) : null
      }
    >
      <Form.TextField
        id="input"
        title="Input"
        placeholder="Unix time (seconds) or date string"
        value={input}
        onChange={setInput}
      />
      <Form.Dropdown id="timezone" title="Timezone" value={timezone} onChange={setTimezone}>
        {TIMEZONES.map((tz) => (
          <Form.Dropdown.Item key={tz.id} value={tz.id} title={tz.name} />
        ))}
      </Form.Dropdown>
      {info && !info.error && (
        <>
          <Form.Description
            title={`Time (${TIMEZONES.find((z) => z.id === timezone)?.name})`}
            text={info.local || ""}
          />
          <Form.Description title="UTC (ISO 8601)" text={info.utc || ""} />
          <Form.Description title="Unix time" text={info.unix?.toString() || ""} />
          <Form.Description title="Day of year" text={info.dayOfYear?.toString() || ""} />
          <Form.Description title="Week of year" text={info.weekOfYear?.toString() || ""} />
          <Form.Description title="Is leap year?" text={info.isLeapYear ? "Yes" : "No"} />
        </>
      )}
      {info && info.error && <Form.Description title="Error" text={info.error} />}
    </Form>
  );
}
