import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { DateTime } from "luxon";
import { normalize } from "../lib/normalize";
import { trimOrNull } from "../lib/format";
import type { Event, ParsedTimestamp } from "../types";

type ManualEventFormProps = {
  readonly onSubmit: (parsed: ParsedTimestamp) => Promise<void> | void;
  // Optional existing event — switches the form into edit mode. Fields are
  // pre-seeded from the event, the submit button becomes "Save Changes", and
  // the navigation title shifts to reflect editing rather than creating.
  readonly initialEvent?: Event;
};

type InputMode = "precise" | "quick";
type ZoneMode = "local" | "utc";

type TimeParts = {
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly millisecond: number;
};

const EMPTY_DASH = "—";

/**
 * Parse a free-text time string into H/M/S/ms components.
 * Accepts: "HH:mm", "HH:mm:ss", "HH:mm:ss.fff", "h:mm AM/PM",
 * "h:mm:ss AM/PM". Returns null if the string doesn't match any form.
 */
function parseTimeString(input: string): TimeParts | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const formats = ["H:mm:ss.SSS", "H:mm:ss", "H:mm", "h:mm:ss a", "h:mm a"];

  for (const fmt of formats) {
    const dt = DateTime.fromFormat(trimmed.toUpperCase(), fmt);
    if (dt.isValid) {
      return {
        hour: dt.hour,
        minute: dt.minute,
        second: dt.second,
        millisecond: dt.millisecond,
      };
    }
  }
  return null;
}

/**
 * Combine a picked date (from Form.DatePicker Type.Date — a JS Date anchored
 * to local midnight of the chosen day) with parsed time parts and a zone
 * mode. Returns epoch ms, or null if the combination is invalid.
 */
function combineDateAndTime(date: Date, time: TimeParts, mode: ZoneMode): number | null {
  // Form.DatePicker Type.Date returns a Date at local midnight. Pull the
  // Y/M/D from the local interpretation — that's what the user picked.
  const localDate = DateTime.fromJSDate(date);
  const combined = DateTime.fromObject(
    {
      year: localDate.year,
      month: localDate.month,
      day: localDate.day,
      hour: time.hour,
      minute: time.minute,
      second: time.second,
      millisecond: time.millisecond,
    },
    { zone: mode === "utc" ? "utc" : "local" }
  );
  return combined.isValid ? combined.toMillis() : null;
}

export function ManualEventForm({ onSubmit, initialEvent }: ManualEventFormProps) {
  const { pop } = useNavigation();

  const isEdit = initialEvent !== undefined;

  // Edit mode always uses precise input — the user needs exact control.
  const [inputMode, setInputMode] = useState<InputMode>("precise");

  // --- Precise mode state ---

  // Edit mode seeds from the event's canonical UTC representation. The date
  // picker expects a local-midnight Date, so we build one from the UTC Y/M/D
  // of the event. Default zone mode is UTC because the stored iso *is* UTC —
  // saving without changing the dropdown round-trips to the same timestamp.
  const [pickedDate, setPickedDate] = useState<Date>(() => {
    if (initialEvent !== undefined) {
      const utc = DateTime.fromISO(initialEvent.iso, { zone: "utc" });
      return DateTime.fromObject({ year: utc.year, month: utc.month, day: utc.day }, { zone: "local" })
        .startOf("day")
        .toJSDate();
    }
    return DateTime.local().startOf("day").toJSDate();
  });
  const [timeText, setTimeText] = useState<string>(() => {
    if (initialEvent !== undefined) {
      const utc = DateTime.fromISO(initialEvent.iso, { zone: "utc" });
      // Drop trailing .000 for a cleaner default, keep fractional seconds
      // otherwise so the user doesn't silently lose precision on save.
      return utc.millisecond === 0 ? utc.toFormat("HH:mm:ss") : utc.toFormat("HH:mm:ss.SSS");
    }
    return DateTime.local().toFormat("HH:mm:ss");
  });
  const [zoneMode, setZoneMode] = useState<ZoneMode>(isEdit ? "utc" : "local");
  const [timeError, setTimeError] = useState<string | undefined>(undefined);

  // --- Quick mode state ---

  const [quickDate, setQuickDate] = useState<Date | null>(
    initialEvent !== undefined ? new Date(initialEvent.timestamp) : null
  );

  // --- Derived epoch ---

  const parsedTime = parseTimeString(timeText);
  const preciseEpochMs = parsedTime !== null ? combineDateAndTime(pickedDate, parsedTime, zoneMode) : null;
  const quickEpochMs = quickDate !== null ? quickDate.getTime() : null;
  const epochMs = inputMode === "quick" ? quickEpochMs : preciseEpochMs;

  const utcText =
    epochMs !== null ? DateTime.fromMillis(epochMs, { zone: "utc" }).toFormat("yyyy-MM-dd HH:mm:ss 'UTC'") : EMPTY_DASH;
  const localText =
    epochMs !== null
      ? DateTime.fromMillis(epochMs, { zone: "utc" }).toLocal().toFormat("yyyy-MM-dd HH:mm:ss ZZZZ")
      : EMPTY_DASH;

  return (
    <Form
      navigationTitle={isEdit ? "Edit Event" : "New Manual Event"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEdit ? "Save Changes" : "Pin to Timeline"}
            icon={isEdit ? Icon.Check : Icon.Pin}
            onSubmit={async (values: { label?: string; url?: string; data?: string }) => {
              if (inputMode === "precise" && parsedTime === null) {
                setTimeError("Invalid time (try HH:mm:ss or h:mm AM/PM)");
                return;
              }
              if (epochMs === null) {
                if (inputMode === "precise") setTimeError("Could not combine date and time");
                return;
              }
              const parsed: ParsedTimestamp = {
                ...normalize(epochMs, values.data?.trim() ?? ""),
                ambiguous: false,
                label: trimOrNull(values.label),
                url: trimOrNull(values.url),
                source: "",
                format: "Manual",
              };
              await onSubmit(parsed);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      {!isEdit && (
        <Form.Dropdown
          id="inputMode"
          title="Input Mode"
          value={inputMode}
          onChange={(v) => setInputMode(v === "quick" ? "quick" : "precise")}
        >
          <Form.Dropdown.Item value="precise" title="Precise" icon={Icon.Clock} />
          <Form.Dropdown.Item value="quick" title="Quick" icon={Icon.Wand} />
        </Form.Dropdown>
      )}
      {inputMode === "quick" && !isEdit ? (
        <Form.DatePicker
          id="quickDateTime"
          title="Date & Time"
          type={Form.DatePicker.Type.DateTime}
          value={quickDate}
          onChange={setQuickDate}
        />
      ) : (
        <>
          <Form.DatePicker
            id="date"
            title="Date"
            type={Form.DatePicker.Type.Date}
            value={pickedDate}
            onChange={(v) => {
              if (v !== null) setPickedDate(v);
            }}
          />
          <Form.TextField
            id="time"
            title="Time"
            placeholder="HH:mm:ss (e.g. 15:20:50)"
            value={timeText}
            {...(timeError !== undefined ? { error: timeError } : {})}
            onChange={(v) => {
              setTimeText(v);
              if (timeError !== undefined) setTimeError(undefined);
            }}
          />
          <Form.Dropdown
            id="zone"
            title="Interpret As"
            value={zoneMode}
            onChange={(v) => {
              setZoneMode(v === "utc" ? "utc" : "local");
            }}
          >
            <Form.Dropdown.Item value="local" title="Local" icon={Icon.Clock} />
            <Form.Dropdown.Item value="utc" title="UTC" icon={Icon.Globe} />
          </Form.Dropdown>
        </>
      )}
      <Form.Description title="UTC" text={utcText} />
      <Form.Description title="Local" text={localText} />
      <Form.Separator />
      <Form.TextField
        id="label"
        title="Label"
        placeholder="e.g., api-gw, postgres, auth-service (optional)"
        defaultValue={initialEvent?.label ?? ""}
      />
      <Form.TextField
        id="url"
        title="URL"
        placeholder="e.g., https://grafana.internal/d/abc123 (optional)"
        defaultValue={initialEvent?.url ?? ""}
      />
      <Form.TextArea
        id="data"
        title="Data"
        placeholder="Log line, annotation, or any context (optional)"
        defaultValue={initialEvent?.data ?? ""}
      />
    </Form>
  );
}
