import { showToast, Toast, updateCommandMetadata } from "@raycast/api";
import { API_HEADERS, API_URL, parseResponse } from "./mailersend";
import { type APIQuota } from "./interfaces";

export default async function APIQuota() {
  const toast = await showToast(Toast.Style.Animated, "Fetching");
  try {
    const response = await fetch(API_URL + "api-quota", {
      headers: API_HEADERS,
    });
    const { quota, remaining, reset } = (await parseResponse(response)) as APIQuota;
    const message = `Quota: ${quota} | Remaining: ${remaining} | Reset: ${new Date(reset).toDateString()}`;
    toast.style = Toast.Style.Success;
    toast.title = "Fetched";
    toast.message = message;
    await updateCommandMetadata({
      subtitle: `MailerSend - ${message}`,
    });
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed";
    toast.message = `${error}`;
  }
}
