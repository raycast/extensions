import { Toast, showToast } from "@raycast/api";
import { errorMessage } from "./api";

/** Runs a Sonos action behind an animated toast and reports success or the error message. */
export async function run(label: string, fn: () => Promise<string | void>, after?: () => void) {
  const toast = await showToast({ style: Toast.Style.Animated, title: label });
  try {
    const msg = await fn();
    toast.style = Toast.Style.Success;
    toast.title = msg || label;
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = errorMessage(e);
  }
  after?.();
}
