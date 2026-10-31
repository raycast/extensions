import { open, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { pondClient } from "./api";
import { validatedUrl } from "./api/client";

export async function saveWithFeedback(getUrl: () => string | Promise<string>, tags?: string[]) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Saving URL to Pond" });
  try {
    const url = validatedUrl(await getUrl());
    const result = await pondClient().enqueue(url, tags);
    toast.style = Toast.Style.Success;
    toast.title = result.created ? "Queued in Pond" : tags?.length ? "Updated Tags in Pond" : "Already in Pond";
    toast.message = new URL(url).hostname;
    toast.primaryAction = { title: "Open Pond", onAction: () => open("pond://library") };
    return true;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not Save URL";
    toast.message = error instanceof Error ? error.message : "Open Pond and try again.";
    toast.primaryAction = { title: "Open Preferences", onAction: openExtensionPreferences };
    return false;
  }
}
