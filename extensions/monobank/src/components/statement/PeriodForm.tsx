import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import { Period, PeriodPreset } from "../../types";
import { STATEMENT_MAX_PERIOD } from "../../data/constants";
import { getHistoryCutoff } from "../../services/statement";
import {
  endOfDay,
  formatDate,
  getLatestPeriodEnd,
  isPreset,
  periodPresetTitles,
  resolvePeriod,
  startOfDay,
  validatePeriod,
} from "../../utils";

type Choice = PeriodPreset | "custom";

interface FormValues {
  choice: Choice;
  from?: Date | null;
  to?: Date | null;
}

type Errors = { from?: string; to?: string };

const presets = Object.entries(periodPresetTitles) as [PeriodPreset, string][];

/** The whole From and To days, in unix seconds. A range ending today ends now, since monobank rejects future times. */
function getCustomRange(from: Date, to: Date, now: Date) {
  return {
    from: Math.floor(startOfDay(from).getTime() / 1000),
    to: Math.floor(Math.min(endOfDay(to).getTime(), now.getTime()) / 1000),
  };
}

/**
 * The error of a custom range: a start after the end on From, a range too long or in the future on To. A range
 * starting on or after `storedFrom` (unix seconds) is kept locally, so it can be any length.
 */
function getRangeErrors(fromDate: Date | null, toDate: Date | null, now: Date, storedFrom: number): Errors {
  if (!fromDate || !toDate) return {};

  const { from, to } = getCustomRange(fromDate, toDate, now);
  const isStored = from >= storedFrom;
  // A stored range skips the length check; `from >= to` and a future end still fail.
  const error = validatePeriod(isStored ? Math.max(from, to - STATEMENT_MAX_PERIOD) : from, to, now);
  if (!error) return {};
  if (from >= to) return { from: error };
  if (to - from > STATEMENT_MAX_PERIOD) {
    const latestEnd = formatDate(new Date(getLatestPeriodEnd(from) * 1000));
    const cutoff = formatDate(new Date(storedFrom * 1000), { year: true });
    return { to: `Up to 31 days: end on ${latestEnd} or earlier, or start on ${cutoff} or later` };
  }
  return { to: error };
}

export default function PeriodForm(props: { period: Period; onChange: (period: Period) => void }) {
  const { period, onChange } = props;
  const navigation = useNavigation();
  const [choice, setChoice] = useState<Choice>(isPreset(period) ? period.preset : "custom");
  // "Required" errors from submitting. Range errors are worked out on every render, so they show while editing.
  const [errors, setErrors] = useState<Errors>({});

  // A custom range starts from the current period, so switching to it is a small step.
  // Computed once: the pickers are controlled, so new props on each render can't reset an entered date.
  const [initial] = useState(() => {
    const current = resolvePeriod(period);
    return {
      from: new Date(current.from * 1000),
      to: new Date((current.to ?? Date.now() / 1000) * 1000),
    };
  });
  const [from, setFrom] = useState<Date | null>(initial.from);
  const [to, setTo] = useState<Date | null>(initial.to);
  const [max] = useState(() => new Date());
  // Ranges from here on are stored locally ("Keep Statements For"), so they can be any length.
  const [storedFrom] = useState(() => getHistoryCutoff(Date.now()));

  function clearError() {
    if (errors.from || errors.to) setErrors({});
  }

  function onSubmit(values: FormValues) {
    if (values.choice !== "custom") {
      onChange({ preset: values.choice });
      navigation.pop();
      return;
    }

    if (!values.from || !values.to) {
      setErrors({ from: values.from ? undefined : "Required", to: values.to ? undefined : "Required" });
      return;
    }

    const now = new Date();
    if (Object.keys(getRangeErrors(values.from, values.to, now, storedFrom)).length) return;

    onChange(getCustomRange(values.from, values.to, now));
    navigation.pop();
  }

  const rangeErrors = getRangeErrors(from, to, new Date(), storedFrom);

  return (
    <Form
      navigationTitle="Change Period"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Change Period" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="choice" title="Period" value={choice} onChange={(value) => setChoice(value as Choice)}>
        <Form.Dropdown.Section>
          {presets.map(([value, title]) => (
            <Form.Dropdown.Item key={value} value={value} title={title} />
          ))}
        </Form.Dropdown.Section>
        <Form.Dropdown.Section>
          <Form.Dropdown.Item value="custom" title="Custom Range" />
        </Form.Dropdown.Section>
      </Form.Dropdown>

      {choice === "custom" && (
        <>
          <Form.DatePicker
            id="from"
            title="From"
            type={Form.DatePicker.Type.Date}
            value={from}
            max={max}
            error={errors.from ?? rangeErrors.from}
            onChange={(date) => {
              setFrom(date);
              clearError();
            }}
          />
          <Form.DatePicker
            id="to"
            title="To"
            type={Form.DatePicker.Type.Date}
            value={to}
            max={max}
            error={errors.to ?? rangeErrors.to}
            onChange={(date) => {
              setTo(date);
              clearError();
            }}
          />
          <Form.Description
            text={`From ${formatDate(new Date(storedFrom * 1000), { year: true })}, a period can be any length ("Keep Statements For"). Before that, up to 31 days, the most monobank returns at once.`}
          />
        </>
      )}
    </Form>
  );
}
