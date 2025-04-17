import { Clipboard, Alert, confirmAlert, showToast, Toast } from "@raycast/api";
import { convertEpochToCocoaCoreDataNumber } from "./date-util";

export default async function Command() {
  const epochDateNumberInput = Number(await Clipboard.readText());
  if (Number.isNaN(epochDateNumberInput)) {
    showToast({
      style: Toast.Style.Failure,
      title: "No number in the clipboard.",
    });
    return;
  }
  let epoch: number;
  if (epochDateNumberInput >= 2 ** 31) {
    epoch = epochDateNumberInput;
  } else {
    epoch = epochDateNumberInput * 1000;
  }
  const date = convertEpochToCocoaCoreDataNumber(epoch);
  const options: Alert.Options = {
    title: date.toString(),
    primaryAction: {
      title: "Copy to clipboard",
      onAction: () => {
        Clipboard.copy(date.toString());
      },
    },
  };
  await confirmAlert(options);
}
