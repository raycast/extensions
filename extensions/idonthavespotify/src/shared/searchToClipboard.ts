import { Clipboard, showToast, Toast } from "@raycast/api";
import { Adapter } from "../@types/global";
import { apiCall, errorMessage } from "./conversion";
import { getPlatformTitle } from "./links";

export const searchToClipboard = async (adapter: Adapter) => {
  const toast = await showToast(Toast.Style.Animated, `Converting to ${getPlatformTitle(adapter)}…`);
  try {
    const clipboardText = await Clipboard.readText();
    if (!clipboardText?.trim()) throw new Error("No text found in the clipboard.");

    const response = await apiCall(clipboardText, adapter);
    const link = response.links.find(({ type }) => type === adapter)?.url;
    if (!link) throw new Error(`No available match found on ${getPlatformTitle(adapter)}.`);

    await Clipboard.copy(link);
    toast.style = Toast.Style.Success;
    toast.title = "Link copied to clipboard";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't convert link";
    toast.message = errorMessage(error);
  }
};
