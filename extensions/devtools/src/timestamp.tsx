import { Action, ActionPanel, Form, Icon, Keyboard, LaunchProps } from "@raycast/api";
import { useMemo, useState } from "react";
import { useInput } from "./hooks/use-input";
import { useTimeZones } from "./hooks/use-time-zones";
import { formatInTimeZone, ParsedTimestamp, parseTimestamp, TimestampUnit } from "./lib/timestamp";
import { timeZoneOptions, timeZoneTitle } from "./lib/time-zones";

const isTimestamp = (text: string) => /^[+-]?\d+(?:\.\d+)?$/.test(text.trim());

export default function Command(props: LaunchProps<{ arguments: { timestamp?: string } }>) {
  const { value, setValue, isLoading } = useInput(props.arguments.timestamp || props.fallbackText, isTimestamp);
  const [unit, setUnit] = useState<TimestampUnit>("auto");
  const { timeZones, selectTimeZones, isLoading: isLoadingZones } = useTimeZones();
  const choices = useMemo(() => timeZoneOptions(timeZones), [timeZones]);
  let result: ParsedTimestamp | undefined;
  let error: string | undefined;
  if (value.trim()) {
    try {
      result = parseTimestamp(value, unit);
    } catch (cause) {
      error = (cause as Error).message;
    }
  }
  const date = result?.date;
  const times = date ? timeZones.map((timeZone) => ({ timeZone, ...formatInTimeZone(date, timeZone) })) : [];
  const allTimes = times.map(({ timeZone, time, offset }) => `${timeZone}: ${time} ${offset}`).join("\n");

  function useNow() {
    setUnit("milliseconds");
    setValue(String(Date.now()));
  }

  return (
    <Form
      navigationTitle="Parse Timestamp"
      isLoading={isLoading || isLoadingZones}
      actions={
        <ActionPanel>
          {times.length > 0 && <Action.CopyToClipboard title="Copy All Time Zone Times" content={allTimes} />}
          {result && <Action.CopyToClipboard title="Copy Second Timestamp" content={String(result.seconds)} />}
          {result && (
            <Action.CopyToClipboard title="Copy Millisecond Timestamp" content={String(result.milliseconds)} />
          )}
          {result && <Action.CopyToClipboard title="Copy ISO Time" content={result.date.toISOString()} />}
          <Action
            title="Use Current Time"
            icon={Icon.Clock}
            shortcut={Keyboard.Shortcut.Common.New}
            onAction={useNow}
          />
          {times.length > 0 && (
            <ActionPanel.Submenu title="Copy Time for a Time Zone" icon={Icon.Globe}>
              {times.map(({ timeZone, time, offset }) => (
                <Action.CopyToClipboard key={timeZone} title={timeZoneTitle(timeZone)} content={`${time} ${offset}`} />
              ))}
            </ActionPanel.Submenu>
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="timestamp"
        title="Timestamp"
        placeholder="Timestamp in seconds or milliseconds"
        value={value}
        onChange={setValue}
        error={error}
      />
      <Form.Dropdown id="unit" title="Unit" value={unit} onChange={(next) => setUnit(next as TimestampUnit)}>
        <Form.Dropdown.Item title="Auto Detect" value="auto" />
        <Form.Dropdown.Item title="Seconds" value="seconds" />
        <Form.Dropdown.Item title="Milliseconds" value="milliseconds" />
      </Form.Dropdown>
      <Form.TagPicker
        id="time-zones"
        title="Time Zones"
        value={timeZones}
        onChange={selectTimeZones}
        error={timeZones.length ? undefined : "Select at least one time zone."}
        info="Search by city or IANA name and select multiple time zones. Selections are saved automatically and times update immediately."
      >
        {choices.map((zone) => (
          <Form.TagPicker.Item key={zone} value={zone} title={timeZoneTitle(zone)} icon={Icon.Globe} />
        ))}
      </Form.TagPicker>
      {result && (
        <>
          <Form.Separator />
          {times.map(({ timeZone, time, offset }) => (
            <Form.Description key={timeZone} title={timeZone} text={`${time} ${offset}`} />
          ))}
          <Form.Separator />
          <Form.Description title="Timestamp (Seconds)" text={String(result.seconds)} />
          <Form.Description title="Timestamp (Milliseconds)" text={String(result.milliseconds)} />
          <Form.Description title="ISO 8601 (UTC)" text={result.date.toISOString()} />
        </>
      )}
    </Form>
  );
}
