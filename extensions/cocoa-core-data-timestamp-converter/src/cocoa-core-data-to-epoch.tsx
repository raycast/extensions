import { Clipboard, Alert, confirmAlert } from "@raycast/api";
import { convertCocoaCoreDataDateToEpoch } from "./date-util";
import { showFailureToast } from "@raycast/utils";

export default async function Command() {
  try {
    const coreDataDateNumber = Number(await Clipboard.readText());
    if (Number.isNaN(coreDataDateNumber)) {
      throw new Error("No number in the clipboard.");
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
  } catch (error) {
    showFailureToast(error);
  }
}
