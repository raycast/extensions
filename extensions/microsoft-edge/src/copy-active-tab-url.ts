import { Clipboard, showToast, Toast } from "@raycast/api";
import { getActiveTabUrl } from "./actions";
import { geNotInstalledMessage } from "./utils/messageUtils";
import { getApplicationName } from "./utils/appUtils";
import { DEFAULT_ERROR_TITLE } from "./constants";

export default async function CopyActiveTabUrl() {
  const toast = await showToast(Toast.Style.Animated, "Fetching URL");
  try {
    const url = await getActiveTabUrl();
    await Clipboard.copy(url);
    toast.style = Toast.Style.Success;
    toast.title = `📋 '${url}' copied to Clipboard`;
  } catch (error: unknown) {
    toast.style = Toast.Style.Failure;
    toast.title = DEFAULT_ERROR_TITLE;
    if (error instanceof Error && error.message === geNotInstalledMessage()) {
      toast.message = `${getApplicationName()} browser is not installed`;
    } else {
      toast.message = `${error}`;
    }
  }
}
