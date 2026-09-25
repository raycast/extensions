import { Clipboard, showToast, Toast } from "@raycast/api";
import { Adapter } from "../@types/global";
import { getSiteUrl } from "../constants";
import { apiCall, errorMessage } from "./conversion";
import { getPlatformTitle, isKnownMusicLink } from "./links";

export const searchToClipboard = async (adapter: Adapter) => {
  const toast = await showToast(Toast.Style.Animated, `Converting to ${getPlatformTitle(adapter)}…`);
  try {
    const clipboardText = (await Clipboard.readText())?.trim();
    if (!clipboardText) throw new Error("No text found in the clipboard.");

    let instanceUrl: string | undefined;
    try {
      instanceUrl = getSiteUrl();
    } catch {
      instanceUrl = undefined;
    }
    if (!isKnownMusicLink(clipboardText, instanceUrl)) {
      throw new Error("Clipboard is not a link from a supported music service.");
    }

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
