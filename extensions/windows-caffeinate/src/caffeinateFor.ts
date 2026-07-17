import { showToast, Toast } from "@raycast/api";
import { startCaffeinate } from "./utils";

export default async function Command(props: { arguments: Arguments.CaffeinateFor }) {
  const { hours, minutes, seconds } = props.arguments;
  const hasValue = hours || minutes || seconds;

  if (!hasValue) {
    await showToast(Toast.Style.Failure, "No values set for caffeinate length");
    return;
  }

  const validInput =
    (!hours || (Number.isInteger(Number(hours)) && Number(hours) >= 0)) &&
    (!minutes || (Number.isInteger(Number(minutes)) && Number(minutes) >= 0)) &&
    (!seconds || (Number.isInteger(Number(seconds)) && Number(seconds) >= 0));

  if (!validInput) {
    await showToast(Toast.Style.Failure, "Please ensure all arguments are whole numbers");
    return;
  }

  const totalSeconds = Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);

  // hasValue only checked for a non-empty string (so "0" passes it) — but a
  // duration of exactly 0 seconds would hit startCaffeinate's "0 = indefinite"
  // sentinel and silently caffeinate forever instead of erroring or no-oping.
  if (totalSeconds <= 0) {
    await showToast(Toast.Style.Failure, "Please specify a duration greater than zero");
    return;
  }

  const formattedTime = `${hours ? `${hours}h` : ""}${minutes ? `${minutes}m` : ""}${seconds ? `${seconds}s` : ""}`;

  try {
    await startCaffeinate({ status: true }, `Caffeinating your PC for ${formattedTime}`, {
      durationSeconds: totalSeconds,
    });
  } catch (error) {
    await showToast(Toast.Style.Failure, "Failed to caffeinate", String(error));
  }
}
