import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { startCaffeinate, deviceName } from "./utils";

function getValidationError(values: { hours?: string; minutes?: string; seconds?: string }): string | null {
  const { hours, minutes, seconds } = values;
  const hasValue = hours || minutes || seconds;

  if (!hasValue) {
    return "No values set for caffeinate length";
  }

  const validInput =
    (!hours || (Number.isInteger(Number(hours)) && Number(hours) >= 0)) &&
    (!minutes || (Number.isInteger(Number(minutes)) && Number(minutes) >= 0)) &&
    (!seconds || (Number.isInteger(Number(seconds)) && Number(seconds) >= 0));

  if (!validInput) {
    return "Please ensure all fields are whole numbers";
  }

  const totalSeconds = Number(hours || 0) * 3600 + Number(minutes || 0) * 60 + Number(seconds || 0);
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "Please enter a duration greater than zero";
  }

  return null;
}

async function caffeinateFor(values: { hours?: string; minutes?: string; seconds?: string }) {
  const { hours, minutes, seconds } = values;

  const totalSeconds = Number(hours || 0) * 3600 + Number(minutes || 0) * 60 + Number(seconds || 0);
  const formattedTime = `${hours ? `${hours}h` : ""}${minutes ? `${minutes}m` : ""}${seconds ? `${seconds}s` : ""}`;

  await startCaffeinate(
    { menubar: true, status: true },
    `Caffeinating your ${deviceName()} for ${formattedTime}`,
    `-t ${totalSeconds}`,
    { kind: "for", endsAt: new Date(Date.now() + totalSeconds * 1000).toISOString() },
  );
}

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Caffeinate"
            onSubmit={async (values: { hours?: string; minutes?: string; seconds?: string }) => {
              const error = getValidationError(values);
              if (error) {
                await showToast(Toast.Style.Failure, error);
                return;
              }
              // Reset nav first so popToRoot doesn't race with showHUD inside
              // startCaffeinate and cut the HUD short. The caffeinate work
              // continues asynchronously after the view unmounts.
              await popToRoot();
              await caffeinateFor({ hours: values.hours, minutes: values.minutes, seconds: values.seconds });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="hours" title="Hours" placeholder="0" />
      <Form.TextField id="minutes" title="Minutes" placeholder="0" />
      <Form.TextField id="seconds" title="Seconds" placeholder="0" />
    </Form>
  );
}
