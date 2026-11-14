import { getPreferenceValues, showToast, Toast, open } from "@raycast/api";
import { friendlyError, SITE_URL } from "./logic";
import { makeClient } from "./client";

export function client() {
  const { apiKey } = getPreferenceValues<Preferences>();
  return makeClient(apiKey);
}

/** Shows any error as a failure toast; a paused answer gets a way to the website. Never throws. */
export async function showError(err: unknown, toast?: Toast) {
  const f = friendlyError(err);
  const options: Toast.Options = {
    style: Toast.Style.Failure,
    title: f.title,
    message: f.message,
    ...(f.paused ? { primaryAction: { title: "Open kovapdf.com", onAction: () => void open(SITE_URL) } } : {}),
  };
  if (toast) {
    toast.style = options.style!;
    toast.title = options.title;
    toast.message = options.message;
    if (options.primaryAction) toast.primaryAction = options.primaryAction;
  } else {
    await showToast(options);
  }
}
