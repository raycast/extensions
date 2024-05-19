import { showToast, Toast } from "@raycast/api";
import { startCaffeinate } from "./utils";

interface Arguments {
  hours?: string;
  minutes?: string;
  seconds?: string;
}

export default async function Command(props: { arguments: Arguments }) {
  const { hours, minutes, seconds } = props.arguments;

  const hasValue = hours || minutes || seconds;

  if (!hasValue) {
    await showToast(Toast.Style.Failure, "No values set for caffeinate length");
    return;
  }

  const parsedHours = parseInt(hours || "0", 10);
  const parsedMinutes = parseInt(minutes || "0", 10);
  const parsedSeconds = parseInt(seconds || "0", 10);

  const validInput =
    (!hours || (Number.isInteger(parsedHours) && parsedHours >= 0)) &&
    (!minutes || (Number.isInteger(parsedMinutes) && parsedMinutes >= 0)) &&
    (!seconds || (Number.isInteger(parsedSeconds) && parsedSeconds >= 0));

  if (!validInput) {
    await showToast(Toast.Style.Failure, "Please ensure all arguments are whole numbers");
    return;
  }

  const totalSeconds = parsedHours * 3600 + parsedMinutes * 60 + parsedSeconds;
  const caffeinateString =
    `${parsedHours > 0 ? `${parsedHours}h` : ""}` +
    `${parsedMinutes > 0 ? `${parsedMinutes}m` : ""}` +
    `${parsedSeconds > 0 ? `${parsedSeconds}s` : ""}`;

  await startCaffeinate(
    { menubar: true, status: true },
    `Caffeinating your Mac for ${caffeinateString}`,
    `-t ${totalSeconds}`,
  );
}
