import { showToast, Toast } from "@raycast/api";
import { isValidInteger, startCaffeinate } from "./utils";

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

  let totalSeconds = 0;
  let caffeinateString = "";
  let validInput = true;

  if (hours) {
    if (isValidInteger(hours)) {
      totalSeconds += parseInt(hours, 10) * 3600;
      caffeinateString += `${hours}h`;
    } else {
      validInput = false;
    }
  }

  if (minutes) {
    if (isValidInteger(minutes)) {
      totalSeconds += parseInt(minutes, 10) * 60;
      caffeinateString += `${minutes}m`;
    } else {
      validInput = false;
    }
  }

  if (seconds) {
    if (isValidInteger(seconds)) {
      totalSeconds += parseInt(seconds, 10);
      caffeinateString += `${seconds}s`;
    } else {
      validInput = false;
    }
  }

  if (!validInput) {
    await showToast(Toast.Style.Failure, "Please ensure all arguments are whole numbers");
    return;
  }

  await startCaffeinate(
    { menubar: true, status: true },
    `Caffeinating your Mac for ${caffeinateString}`,
    `-t ${totalSeconds}`,
  );
}
