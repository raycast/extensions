import { getPreferenceValues, Action, showToast, Toast } from "@raycast/api";
import fetch, { AbortError } from "node-fetch";

export function UNIXTimestampToTime(UNIX_timestamp: number) {
  const date = new Date(UNIX_timestamp * 1000);
  const hours = date.getHours();
  const minutes = "0" + date.getMinutes();
  const seconds = "0" + date.getSeconds();

  // Will display time in 10:30:23 format
  const formattedTime = hours + ":" + minutes.substr(-2) + ":" + seconds.substr(-2);
  return formattedTime;
}

export function AddToListAction(props: { domain: string; listType: string }) {
  function addToList() {
    const { PIHOLE_URL, API_TOKEN } = getPreferenceValues();
    showToast({
      style: Toast.Style.Animated,
      title: props.listType == "black" ? "Adding to blocklist..." : "Adding to whitelist...",
    });
    fetch(
      `http://${cleanPiholeURL(PIHOLE_URL)}/admin/api.php?list=${props.listType}&add=${props.domain}&auth=${API_TOKEN}`
    ).then((res) => {
      if (res.ok) {
        showToast({
          style: Toast.Style.Success,
          title: props.listType == "black" ? "Added to blocklist!" : "Added whitelist!",
        });
      }
    });
  }
  return (
    <Action title={props.listType == "black" ? "Add to blacklist" : "Add to whitelist"} onAction={() => addToList()} />
  );
}

export function cleanPiholeURL(url: string) {
  return url.replace(/\/$/, "").replace(/http:\/\//, "");
}

export async function fetchRequestTimeout(endpoint: string) {
  // AbortController was added in node v14.17.0 globally
  const AbortController = globalThis.AbortController;

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 3000);

  try {
    const response = await fetch(endpoint, { signal: controller.signal });
    return response;
  } catch (error) {
    if (error instanceof AbortError) {
      return "query-aborted";
    }
  } finally {
    clearTimeout(timeout);
  }
}
