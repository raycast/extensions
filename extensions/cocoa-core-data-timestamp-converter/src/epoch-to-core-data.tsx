import { Clipboard, Alert, confirmAlert } from "@raycast/api";
import { convertEpochToCocoaCoreDataNumber } from "./date-util";
import { showFailureToast } from "@raycast/utils";

export default async function Command() {
  try {
    const epochDateNumberInput = Number(await Clipboard.readText());
    if (Number.isNaN(epochDateNumberInput)) {
      throw new Error("No number in the clipboard.");
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
  } catch (error) {
    showFailureToast(error);
  }
}
