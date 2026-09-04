import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  dateToWallClockParts,
  formatInTimeZone,
  formatWallClockParts,
  parseDateTimeText,
  parseTimestamp,
  timestampFromMilliseconds,
  TimestampUnit,
  wallClockToMilliseconds,
} from "./time";

const UNIT_STORAGE_KEY = "timestamp-unit";
const SYSTEM_TIME_ZONE =
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const TIME_ZONES = [
  SYSTEM_TIME_ZONE,
  "UTC",
  ...Intl.supportedValuesOf("timeZone"),
].filter((zone, index, all) => all.indexOf(zone) === index);

type ActiveResult = "current" | "timestamp-to-date" | "date-to-timestamp";

export default function Command() {
  const [unit, setUnit] = useState<TimestampUnit>("seconds");
  const [now, setNow] = useState(() => Date.now());
  const [timestampInput, setTimestampInput] = useState(() =>
    timestampFromMilliseconds(Date.now(), "seconds"),
  );
  const [timestampTimeZone, setTimestampTimeZone] = useState(SYSTEM_TIME_ZONE);
  const [dateInput, setDateInput] = useState<Date | null>(() => new Date());
  const [dateTimeText, setDateTimeText] = useState(() =>
    formatWallClockParts(dateToWallClockParts(new Date())),
  );
  const [dateTimeZone, setDateTimeZone] = useState(SYSTEM_TIME_ZONE);
  const [activeResult, setActiveResult] = useState<ActiveResult>("current");

  useEffect(() => {
    LocalStorage.getItem<string>(UNIT_STORAGE_KEY).then((savedUnit) => {
      if (savedUnit !== "seconds" && savedUnit !== "milliseconds") return;
      setUnit(savedUnit);
      setTimestampInput((value) =>
        timestampFromMilliseconds(parseTimestamp(value, "seconds"), savedUnit),
      );
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(
      () => setNow(Date.now()),
      unit === "seconds" ? 250 : 50,
    );
    return () => clearInterval(interval);
  }, [unit]);

  const currentTimestamp = timestampFromMilliseconds(now, unit);
  const convertedDate = useMemo(() => {
    try {
      const milliseconds = parseTimestamp(timestampInput, unit);
      return {
        value: formatInTimeZone(
          milliseconds,
          timestampTimeZone,
          unit === "milliseconds",
        ),
        error: undefined,
      };
    } catch (error) {
      return {
        value: "—",
        error: error instanceof Error ? error.message : "Unable to convert",
      };
    }
  }, [timestampInput, timestampTimeZone, unit]);

  const convertedTimestamp = useMemo(() => {
    try {
      const milliseconds = wallClockToMilliseconds(
        parseDateTimeText(dateTimeText),
        dateTimeZone,
      );
      return {
        value: timestampFromMilliseconds(milliseconds, unit),
        error: undefined,
      };
    } catch (error) {
      return {
        value: "—",
        error: error instanceof Error ? error.message : "Unable to convert",
      };
    }
  }, [dateTimeText, dateTimeZone, unit]);

  const primaryCopy =
    activeResult === "timestamp-to-date"
      ? {
          title: "Copy Date & Time",
          value: convertedDate.value,
          error: convertedDate.error,
        }
      : activeResult === "date-to-timestamp"
        ? {
            title: "Copy Timestamp",
            value: convertedTimestamp.value,
            error: convertedTimestamp.error,
          }
        : {
            title: "Copy Current",
            value: currentTimestamp,
            error: undefined,
          };

  async function changeUnit(nextUnit: TimestampUnit) {
    if (nextUnit === unit) return;
    try {
      setTimestampInput(
        timestampFromMilliseconds(
          parseTimestamp(timestampInput, unit),
          nextUnit,
        ),
      );
    } catch {
      // Keep invalid input unchanged so it can be corrected.
    }
    setUnit(nextUnit);
    setActiveResult("current");
    await LocalStorage.setItem(UNIT_STORAGE_KEY, nextUnit);
  }

  async function pasteTimestamp() {
    const text = await Clipboard.readText();
    if (text?.trim()) {
      setTimestampInput(text.trim());
      setActiveResult("timestamp-to-date");
    }
  }

  function useCurrentDateTime() {
    const date = new Date();
    setDateInput(date);
    setDateTimeText(formatWallClockParts(dateToWallClockParts(date)));
    setActiveResult("date-to-timestamp");
  }

  function selectCalendarDate(date: Date | null) {
    setDateInput(date);
    if (date) {
      setDateTimeText(formatWallClockParts(dateToWallClockParts(date)));
      setActiveResult("date-to-timestamp");
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          {primaryCopy.error ? (
            <Action
              title="Fix Invalid Input to Copy"
              icon={Icon.Warning}
              onAction={() =>
                showToast({
                  style: Toast.Style.Failure,
                  title: "Unable to Copy",
                  message: primaryCopy.error,
                })
              }
            />
          ) : (
            <Action.CopyToClipboard
              title={primaryCopy.title}
              content={primaryCopy.value}
              icon={Icon.Clipboard}
            />
          )}
          <ActionPanel.Section title="Copy Specific Result">
            <Action.CopyToClipboard
              title="Copy Current"
              content={currentTimestamp}
            />
            {!convertedDate.error ? (
              <Action.CopyToClipboard
                title="Copy Date & Time"
                content={convertedDate.value}
              />
            ) : null}
            {!convertedTimestamp.error ? (
              <Action.CopyToClipboard
                title="Copy Timestamp"
                content={convertedTimestamp.value}
              />
            ) : null}
          </ActionPanel.Section>
          <ActionPanel.Section title="Quick Actions">
            <Action
              title="Use Current Timestamp"
              icon={Icon.Bolt}
              onAction={() => {
                setTimestampInput(timestampFromMilliseconds(Date.now(), unit));
                setActiveResult("timestamp-to-date");
              }}
            />
            <Action
              title="Use Current Date and Time"
              icon={Icon.Calendar}
              onAction={useCurrentDateTime}
            />
            <Action
              title="Paste Timestamp from Clipboard"
              icon={Icon.Clipboard}
              onAction={pasteTimestamp}
            />
            <Action
              title="Copy All Results"
              icon={Icon.CopyClipboard}
              onAction={async () => {
                await Clipboard.copy(
                  [
                    `Current timestamp: ${currentTimestamp}`,
                    `Timestamp to date: ${convertedDate.value} (${timestampTimeZone})`,
                    `Date to timestamp: ${convertedTimestamp.value} (${dateTimeZone})`,
                  ].join("\n"),
                );
                await showToast({
                  style: Toast.Style.Success,
                  title: "Copied All Results",
                });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="unit"
        title="Unit"
        value={unit}
        filtering={false}
        onChange={(value) => changeUnit(value as TimestampUnit)}
        onFocus={() => setActiveResult("current")}
      >
        <Form.Dropdown.Item value="seconds" title="Seconds (s)" />
        <Form.Dropdown.Item value="milliseconds" title="Milliseconds (ms)" />
      </Form.Dropdown>

      <Form.Separator />
      <Form.Description
        title="Current Timestamp"
        text={`${currentTimestamp}  ${unit === "seconds" ? "seconds" : "milliseconds"}`}
      />

      <Form.Separator />
      <Form.Description
        title="Timestamp → Date and Time"
        text="Updates as you type"
      />
      <Form.TextField
        id="timestamp"
        title="Timestamp"
        placeholder={
          unit === "seconds"
            ? "For example, 1788414735"
            : "For example, 1788414735000"
        }
        value={timestampInput}
        onChange={(value) => {
          setTimestampInput(value);
          setActiveResult("timestamp-to-date");
        }}
        onFocus={() => setActiveResult("timestamp-to-date")}
        error={convertedDate.error}
      />
      <TimeZoneDropdown
        id="timestamp-time-zone"
        value={timestampTimeZone}
        onChange={(value) => {
          setTimestampTimeZone(value);
          setActiveResult("timestamp-to-date");
        }}
        onFocus={() => setActiveResult("timestamp-to-date")}
      />
      <Form.Description title="Result" text={convertedDate.value} />

      <Form.Separator />
      <Form.Description
        title="Date and Time → Timestamp"
        text="Type a value or select one from the calendar"
      />
      <Form.TextField
        id="date-time-text"
        title="Date and Time"
        placeholder="For example, 2026-06-10 10:23:00"
        value={dateTimeText}
        onChange={(value) => {
          setDateTimeText(value);
          setActiveResult("date-to-timestamp");
        }}
        onFocus={() => setActiveResult("date-to-timestamp")}
        error={convertedTimestamp.error}
      />
      <Form.DatePicker
        id="date-time"
        title="Calendar"
        type={Form.DatePicker.Type.DateTime}
        value={dateInput}
        onChange={selectCalendarDate}
        onFocus={() => setActiveResult("date-to-timestamp")}
      />
      <TimeZoneDropdown
        id="date-time-zone"
        value={dateTimeZone}
        onChange={(value) => {
          setDateTimeZone(value);
          setActiveResult("date-to-timestamp");
        }}
        onFocus={() => setActiveResult("date-to-timestamp")}
      />
      <Form.Description title="Result" text={convertedTimestamp.value} />
    </Form>
  );
}

function TimeZoneDropdown(props: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
}) {
  return (
    <Form.Dropdown
      id={props.id}
      title="Time Zone"
      value={props.value}
      onChange={props.onChange}
      onFocus={props.onFocus}
    >
      {TIME_ZONES.map((zone) => (
        <Form.Dropdown.Item
          key={zone}
          value={zone}
          title={zone === SYSTEM_TIME_ZONE ? `${zone} (System)` : zone}
        />
      ))}
    </Form.Dropdown>
  );
}
