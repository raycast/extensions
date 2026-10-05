import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import { formatDay, parseDay } from "../api/dates";

/// One field, for "Pick Date…" and "Set Deadline…". The CLI speaks YYYY-MM-DD
/// in a fixed en_US_POSIX Gregorian formatter, so the date is formatted from
/// the picker's components rather than via toISOString, which would shift the
/// day for anyone east or west of UTC at the wrong hour.
export function DateForm({
  title,
  initial,
  onPick,
}: {
  title: string;
  initial?: string;
  onPick: (date: string) => void;
}) {
  const { pop } = useNavigation();
  const [date, setDate] = useState<Date | null>(
    initial ? parseDay(initial) : null,
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={title}
            onSubmit={() => {
              if (!date) return;
              onPick(formatDay(date));
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.DatePicker
        id="date"
        title={title}
        type={Form.DatePicker.Type.Date}
        value={date}
        onChange={setDate}
      />
    </Form>
  );
}
