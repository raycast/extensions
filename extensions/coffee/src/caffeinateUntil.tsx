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
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayLabel =
    target.toDateString() === now.toDateString()
      ? ""
      : target.toDateString() === tomorrow.toDateString()
        ? "tomorrow at "
        : `${target.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} at `;
  await startCaffeinate(
    { menubar: true, status: true },
    `Caffeinating your Mac until ${dayLabel}${formattedTime}`,
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
  const typedTimeValid = typedTime ? parseTypedTime(typedTime) !== null : false;
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

  // Hide the form when the typed argument parses cleanly so users on the
  // keyboard path don't see a flash before popToRoot dismisses the view.
  // Invalid input falls through to the form so the user can fix via picker.
  if (typedTimeValid) return null;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Caffeinate"
            onSubmit={(values: { target: Date | null }) => {
              if (!values.target) {
                showToast(Toast.Style.Failure, "Please select a time");
                return;
              }
              // Reset nav first so popToRoot doesn't race with showHUD inside
              // startCaffeinate and cut the HUD short. The caffeinate work
              // continues asynchronously after the view unmounts.
              popToRoot();
              caffeinateUntilTarget(values.target);
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
        min={new Date(Date.now() + 60_000)}
      />
    </Form>
  );
}
