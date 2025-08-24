import { showToast, Toast, updateCommandMetadata } from "@raycast/api";
import { API_URL, headers } from "./keygen";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

export default async function APIUsage() {
  const toast = await showToast(Toast.Style.Animated, "Fetching Usage");
  try {
    const response = await fetch(API_URL, {
      method: "HEAD",
      headers,
    });
    const count = response.headers.get("X-Ratelimit-Count");
    const limit = response.headers.get("X-Ratelimit-Limit");
    const reset = response.headers.get("X-Ratelimit-Reset");
    if (!count || !limit || !reset) throw new Error("Unknown Error");
    const message = `Used: ${count}/${limit} - Reset: ${dayjs(dayjs.unix(+reset)).fromNow()}`;
    toast.style = Toast.Style.Success;
    toast.title = "Fetched Usage";
    toast.message = message;
    await updateCommandMetadata({ subtitle: `Keygen | ${message}` });
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not fetch API usage";
    toast.message = `${error}`;
  }
}
