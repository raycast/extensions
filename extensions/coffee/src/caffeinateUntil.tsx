import { Action, ActionPanel, Form, Toast, popToRoot, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { startCaffeinate } from "./utils";

function parseTypedTime(time: string): Date | null {
  const pattern = /^(\d{1,2})(?::(\d\d))? *(am|pm)?$/i;
  if (!pattern.test(time)) return null;

  const [, hourStr, minuteStr, ampm] = pattern.exec(time) ?? [];
  const inputHour = Number(hourStr);
  let hour = inputHour;
  if (ampm?.toLowerCase() == "pm" && inputHour < 12) hour += 12;
  if (ampm?.toLowerCase() == "am" && inputHour == 12) hour = 0;
  const minute = minuteStr ? Number(minuteStr) : 0;

  if (hour < 0 || hour > 24 || minute < 0 || minute > 59) return null;

  const now = new Date();
  const target = new Date();
  target.setHours(hour);
  target.setMinutes(minute);
  target.setSeconds(0);

  // If we have ampm or a 24-hour time, assume it's explicit and use the next day.
  // Otherwise, find the next occurrence of the given 12-hour time.
  const is24h = ampm || hour > 12 || hourStr.startsWith("0");
  while (target <= now) {
    target.setHours(target.getHours() + (is24h ? 24 : 12));
  }

  return target;
}

async function caffeinateUntilTarget(target: Date) {
  const now = new Date();
  const totalSeconds = Math.ceil((target.getTime() - now.getTime()) / 1000);
  if (totalSeconds <= 0) {
    await showToast(Toast.Style.Failure, "Selected time is in the past");
    return;
  }
  const formattedTime = target.toLocaleTimeString([], { timeStyle: "short" });
  const tomorrow = target.getDate() != now.getDate() ? "tomorrow at " : "";
  await startCaffeinate(
    { menubar: true, status: true },
    `Caffeinating your Mac until ${tomorrow}${formattedTime}`,
    `-t ${totalSeconds}`,
  );
}

function defaultPickerTarget(): Date {
  const target = new Date();
  target.setHours(target.getHours() + 1, 0, 0, 0);
  return target;
}

export default function Command(props: { arguments: Arguments.CaffeinateUntil }) {
  const typedTime = props.arguments.time;
  const [handled, setHandled] = useState(false);

  useEffect(() => {
    if (!typedTime || handled) return;
    setHandled(true);
    const target = parseTypedTime(typedTime);
    if (!target) {
      showToast(Toast.Style.Failure, "Unrecognized time format");
      return;
    }
    caffeinateUntilTarget(target).then(() => popToRoot());
  }, [typedTime, handled]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Caffeinate"
            onSubmit={async (values: { target: Date | null }) => {
              if (!values.target) {
                await showToast(Toast.Style.Failure, "Please select a time");
                return;
              }
              await caffeinateUntilTarget(values.target);
              popToRoot();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.DatePicker
        id="target"
        title="Caffeinate Until"
        type={Form.DatePicker.Type.DateTime}
        defaultValue={defaultPickerTarget()}
      />
    </Form>
  );
}
