import { Clipboard, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export const copyWithFeedback = async (content: string, label: string): Promise<void> => {
  try {
    await Clipboard.copy(content);
    await showToast({
      style: Toast.Style.Success,
      title: `${label} copied`,
    });
  } catch (error: unknown) {
    await showFailureToast(error, {
      title: `${label} could not be copied`,
    });
  }
};
