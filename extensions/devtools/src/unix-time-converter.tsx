import { useState, useEffect } from "react";
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
  let unixNano: bigint | null = null;
  let error = "";

  if (/^\d+$/.test(input)) {
    const num = BigInt(input);
    if (input.length > 19) {
      // Assume nanoseconds if more than 19 digits (typical for seconds)
      date = new Date(Number(num / BigInt(1_000_000)));
      unix = Math.floor(Number(num / BigInt(1_000_000_000)));
      unixNano = num;
    } else if (input.length > 13) {
      // Assume microseconds if more than 13 digits
      date = new Date(Number(num / BigInt(1_000)));
      unix = Math.floor(Number(num / BigInt(1_000_000)));
      unixNano = num * BigInt(1_000);
    } else if (input.length > 10) {
      // Assume milliseconds if more than 10 digits
      date = new Date(Number(num));
      unix = Math.floor(Number(num) / 1000);
      unixNano = num * BigInt(1_000_000);
    } else {
      // Input is a Unix timestamp (seconds)
      unix = Number(num);
      date = new Date(unix * 1000);
      unixNano = num * BigInt(1_000_000_000);
    }
  } else {
    // Try to parse as date string
    const parsed = Date.parse(input);
    if (!isNaN(parsed)) {
      date = new Date(parsed);
      unix = Math.floor(date.getTime() / 1000);
      unixNano = BigInt(date.getTime()) * BigInt(1_000_000);
    } else {
      error = "Invalid date or unix time";
    }
  }

  if (!date || isNaN(date.getTime())) {
    error = "Invalid date or unix time";
    return { error };
  }

  // Format for GMT with nanosecond precision
  const gmtBase = date.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hour12: true,
    timeZone: "GMT",
  });

  // Add nanosecond precision manually
  const gmtNano = date.getTime() % 1000;
  const gmtString = `${gmtBase.slice(0, -4)}${gmtNano.toString().padStart(3, "0")}${gmtBase.slice(-4)}`;

  // Format for Your time zone with nanosecond precision
  const localBase = date.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hour12: true,
    timeZone: timeZone === "local" ? undefined : timeZone,
    timeZoneName: "shortOffset",
  });

  // Add nanosecond precision manually
  const localNano = date.getTime() % 1000;
  const localTimeString = `${localBase.slice(0, -4)}${localNano.toString().padStart(3, "0")}${localBase.slice(-4)}`;

  // Calculate relative time in days
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  let relativeTime = "";
  if (diffDays === 0) {
    relativeTime = "Today";
  } else if (diffDays === 1) {
    relativeTime = "Tomorrow";
  } else if (diffDays === -1) {
    relativeTime = "Yesterday";
  } else if (diffDays > 1) {
    relativeTime = `${diffDays} days from now`;
  } else {
    relativeTime = `${Math.abs(diffDays)} days ago`;
  }

  // Calculate Day of year, Week of year, and Is leap year?
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime() + (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const weekOfYear = Math.ceil(((date.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  const isLeapYear = date.getFullYear() % 4 === 0 && (date.getFullYear() % 100 !== 0 || date.getFullYear() % 400 === 0);

  return {
    gmt: gmtString,
    local: localTimeString,
    unix,
    unixNano: unixNano?.toString(),
    relative: relativeTime,
    dayOfYear,
    weekOfYear,
    isLeapYear,
    error: "",
  };
}

export default function Command() {
  // Initialize input with current Unix timestamp in seconds
  const [input, setInput] = useState(Math.floor(Date.now() / 1000).toString());
  const [timezone, setTimezone] = useState("local");
  const [info, setInfo] = useState(getDateInfo(input, timezone));

  useEffect(() => {
    setInfo(getDateInfo(input, timezone));
  }, [input, timezone]);

  return (
    <Form
      actions={
        info && !info.error ? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Unix Time" content={info.unix?.toString() || ""} />
            {info.gmt && <Action.CopyToClipboard title="Copy GMT Time" content={info.gmt} />}
            {info.local && (
              <Action.CopyToClipboard
                title={`Copy Time (${TIMEZONES.find((z) => z.id === timezone)?.name})`}
                content={info.local}
              />
            )}
            {info.relative && <Action.CopyToClipboard title="Copy Relative Time" content={info.relative} />}
            {info.dayOfYear && (
              <Action.CopyToClipboard title="Copy Day of Year" content={info.dayOfYear?.toString() || ""} />
            )}
            {info.weekOfYear && (
              <Action.CopyToClipboard title="Copy Week of Year" content={info.weekOfYear?.toString() || ""} />
            )}
            {info.isLeapYear !== undefined && (
              <Action.CopyToClipboard title="Copy Is Leap Year" content={info.isLeapYear ? "Yes" : "No"} />
            )}
          </ActionPanel>
        ) : null
      }
    >
      <Form.TextField
        id="input"
        title="Input"
        placeholder="Unix time in seconds (e.g. 1709123456) or date string"
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
          {info.gmt && <Form.Description title="GMT" text={info.gmt} />}
          {info.local && <Form.Description title="Your time zone" text={info.local} />}
          {info.relative && <Form.Description title="Relative" text={info.relative} />}
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
