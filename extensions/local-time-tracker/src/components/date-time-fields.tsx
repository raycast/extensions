import { Form } from "@raycast/api";
import { useState } from "react";
import { getStartOfToday } from "../lib/date";
import { formatInputTime, parseLocalDateTime } from "../lib/date-time-input";

export function useDateTimeInput(initialValue: Date) {
  const [original] = useState(initialValue);
  const [date, setDate] = useState<Date | null>(() => getStartOfToday(initialValue));
  const [time, setTime] = useState(() => formatInputTime(initialValue));
  const [dateTouched, setDateTouched] = useState(false);
  const [timeTouched, setTimeTouched] = useState(false);
  const [rangeError, setRangeError] = useState<string>();
  const result = parseLocalDateTime(date, time, original);

  return {
    value: result.value,
    setRangeError,
    validate() {
      setDateTouched(true);
      setTimeTouched(true);
      return result.value;
    },
    dateProps: {
      value: date,
      error: dateTouched ? result.dateError : undefined,
      onChange(value: Date | null) {
        setDate(value);
        setRangeError(undefined);
      },
      onBlur: () => setDateTouched(true),
    },
    timeProps: {
      value: time,
      error: (timeTouched ? result.timeError : undefined) ?? rangeError,
      onChange(value: string) {
        setTime(value);
        setRangeError(undefined);
      },
      onBlur: () => setTimeTouched(true),
    },
  };
}

export function DateTimeFields({
  id,
  title,
  input,
}: {
  id: string;
  title: string;
  input: ReturnType<typeof useDateTimeInput>;
}) {
  return (
    <>
      <Form.DatePicker id={`${id}Date`} title={`${title} Date`} type={Form.DatePicker.Type.Date} {...input.dateProps} />
      <Form.TextField
        id={`${id}Time`}
        title={`${title} Time`}
        placeholder="HH:mm"
        info="24-hour local time, for example 09:30 or 18:05."
        {...input.timeProps}
      />
    </>
  );
}
