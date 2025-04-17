import { Clipboard, Alert, confirmAlert, showToast, Toast } from "@raycast/api";
import { convertCocoaCoreDataDateToEpoch } from "./date-util";

export default async function Command() {
  const coreDataDateNumber = Number(await Clipboard.readText());
  if (Number.isNaN(coreDataDateNumber)) {
    showToast({
      style: Toast.Style.Failure,
      title: "No number in the clipboard.",
    });
    return;
  }
  const date = convertCocoaCoreDataDateToEpoch(coreDataDateNumber);
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
